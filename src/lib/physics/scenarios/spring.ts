import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2, AnimationFrame } from "@/types/cognitive";
import { makeViewport, toSVG, forceArrowLength, makeWorldAxis } from "../coords";
import { weight, FORCE_COLORS, customForce } from "../forces";

/**
 * Ressort horizontal:
 * Phase 1 [0 .. 1.2s]: compression linéaire de 0 à x_max (force appliquée visible)
 * Phase 2 [1.2s ..]: oscillation libre x(t') = x_max·cos(ω·(t-1.2))
 */
export function computeSpring(spec: DiagramSpec, constants: Record<string, number>, frame: AnimationFrame): ResolvedScene {
  const W = 1000;
  const H = 540;
  const g = constants.g ?? 9.81;
  const k = constants.k ?? spec.params.k ?? 50;
  const xMax = spec.params.x ?? constants.x ?? 0.3;
  const L0 = spec.params.L ?? constants.L ?? 1.8;
  const m = spec.objects[0]?.mass ?? constants.m ?? 1;

  const scalePx = 130;
  const vp = makeViewport(W, H, scalePx, 110, H / 2 + 40);

  const elements: ResolvedElement[] = [];

  // Sol
  elements.push({
    id: "ground",
    type: "ground",
    position: toSVG({ x: -0.5, y: -0.5 }, vp),
    end: toSVG({ x: L0 + xMax + 1.5, y: -0.5 }, vp),
  });

  // Mur gauche
  elements.push({
    id: "wall",
    type: "wall",
    position: toSVG({ x: 0, y: 1 }, vp),
    end: toSVG({ x: 0, y: -0.5 }, vp),
  });

  // Phase d'animation
  const COMPRESS_TIME = 1.2;
  let xCompression: number; // déplacement vers la GAUCHE (positif = comprimé)
  let phase: "compression" | "release";
  let phaseLabel: string;

  if (frame.t < COMPRESS_TIME) {
    // Compression linéaire
    xCompression = (frame.t / COMPRESS_TIME) * xMax;
    phase = "compression";
    phaseLabel = "Phase 1 — Compression";
  } else {
    // Oscillation libre
    const omega = Math.sqrt(k / m);
    const tt = frame.t - COMPRESS_TIME;
    xCompression = xMax * Math.cos(omega * tt);
    phase = "release";
    phaseLabel = `Phase 2 — Oscillation (ω=${omega.toFixed(2)})`;
  }

  // Position du bloc : longueur naturelle - compression
  const blockX = L0 - xCompression;
  const sizeM = spec.objects[0]?.size ?? 0.5;
  const sizePx = sizeM * vp.scale;
  const center = toSVG({ x: blockX, y: 0 }, vp);
  const objId = spec.objects[0]?.id ?? "block";

  // Position d'équilibre (ligne pointillée verticale)
  const eqX = toSVG({ x: L0, y: 0 }, vp);
  elements.push({
    id: "equilibrium",
    type: "rope",
    position: { x: eqX.x, y: eqX.y - 60 },
    end: { x: eqX.x, y: eqX.y + 60 },
    meta: { dashed: true },
    label: "x=0",
  });

  // Ressort entre mur et bloc
  elements.push({
    id: "spring",
    type: "spring",
    position: toSVG({ x: 0, y: 0 }, vp),
    end: toSVG({ x: blockX - sizeM / 2, y: 0 }, vp),
    meta: { coils: 10 },
    label: `k=${k} N/m`,
  });

  elements.push({
    id: objId,
    type: "block",
    position: center,
    size: { w: sizePx, h: sizePx },
    label: spec.objects[0]?.label,
  });

  // Repère monde
  const wa = makeWorldAxis(vp);
  elements.push({ id: "world_axis", type: "world_axis", ...wa });

  // Repère local au centre du bloc
  elements.push({
    id: "local_axis",
    type: "local_axis",
    position: center,
    meta: { rotationDeg: 0, length: 32 },
  });

  const objectCenters: Record<string, Vec2> = { [objId]: center };
  const forces: ResolvedForce[] = [];

  // Force ressort: F = k * x_compression vers la DROITE quand comprimé (rappel),
  // vers la gauche quand étiré (oscillation)
  const Fspring = k * xCompression; // signé
  if (Math.abs(Fspring) > 0.5) {
    const ap = forceArrowLength(Fspring);
    const sign = Fspring > 0 ? 1 : -1;
    forces.push({
      id: "F_spring",
      label: "F_ressort",
      magnitude: `${Math.abs(Fspring).toFixed(1)} N`,
      start: center,
      end: { x: center.x + sign * ap, y: center.y },
      color: FORCE_COLORS.spring,
      type: "spring",
      target: objId,
    });
  }

  // Pendant la compression: force appliquée (l'utilisateur pousse vers la gauche)
  if (phase === "compression") {
    const Fapp = k * xCompression + 5;
    const ap = forceArrowLength(Fapp);
    forces.push({
      id: "F_app",
      label: "F_appliquée",
      magnitude: `${Fapp.toFixed(1)} N`,
      start: center,
      end: { x: center.x - ap, y: center.y },
      color: FORCE_COLORS.applied,
      type: "applied",
      target: objId,
    });
  }

  // Forces déclarées par l'IA (poids, normal, etc.)
  spec.forces.filter((f) => f.target === objId).forEach((f) => {
    let vec: Vec2 = { x: 0, y: 0 };
    if (f.type === "weight") vec = weight(m, g);
    else if (f.type === "normal") vec = { x: 0, y: m * g };
    else if (f.type === "spring") return; // déjà géré
    else if (f.type === "applied") return; // déjà géré
    else if (f.direction) vec = customForce(f.direction, f.value ?? k * xMax);
    const mag = Math.hypot(vec.x, vec.y);
    if (mag < 1e-6) return;
    const ap = forceArrowLength(mag);
    forces.push({
      id: f.id,
      label: f.label,
      magnitude: f.magnitude,
      start: center,
      end: { x: center.x + (vec.x / mag) * ap, y: center.y - (vec.y / mag) * ap },
      color: f.color ?? FORCE_COLORS[f.type] ?? FORCE_COLORS.custom,
      type: f.type,
      target: f.target,
    });
  });

  return { width: W, height: H, elements, forces, objectCenters, phaseLabel };
}
