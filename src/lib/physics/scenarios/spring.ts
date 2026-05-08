import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2, AnimationFrame } from "@/types/cognitive";
import { makeViewport, toSVG, forceArrowLength, makeWorldAxis } from "../coords";
import { weight, FORCE_COLORS, customForce } from "../forces";

/**
 * Ressort horizontal OU vertical (selon params.orientation = "vertical").
 */
export function computeSpring(spec: DiagramSpec, constants: Record<string, number>, frame: AnimationFrame): ResolvedScene {
  const orientationParam = (spec.params as any).orientation;
  const isVertical = orientationParam === 1 || orientationParam === "vertical" ||
    (constants as any).orientation === 1;
  if (isVertical) return computeSpringVertical(spec, constants, frame);
  return computeSpringHorizontal(spec, constants, frame);
}

function computeSpringHorizontal(spec: DiagramSpec, constants: Record<string, number>, frame: AnimationFrame): ResolvedScene {
  const W = 1000;
  const H = 540;
  const g = constants.g ?? 9.81;
  const k = constants.k ?? spec.params.k ?? 50;
  const xMax = spec.params.x ?? constants.x ?? 0.3;
  const L0 = spec.params.L ?? constants.L ?? 1.8;
  const m = spec.objects[0]?.mass ?? constants.m ?? 1;

  const scalePx = 130;
  const vp = makeViewport(W, H, scalePx, 110, H - 110);

  const elements: ResolvedElement[] = [];

  elements.push({
    id: "ground",
    type: "ground",
    position: toSVG({ x: -0.5, y: 0 }, vp),
    end: toSVG({ x: L0 + xMax + 1.5, y: 0 }, vp),
  });

  elements.push({
    id: "wall",
    type: "wall",
    position: toSVG({ x: 0, y: 1.5 }, vp),
    end: toSVG({ x: 0, y: 0 }, vp),
  });

  const COMPRESS_TIME = 1.2;
  let xCompression: number;
  let phase: "compression" | "release";
  let phaseLabel: string;

  if (frame.t < COMPRESS_TIME) {
    xCompression = (frame.t / COMPRESS_TIME) * xMax;
    phase = "compression";
    phaseLabel = "Phase 1 — Compression";
  } else {
    const omega = Math.sqrt(k / m);
    const tt = frame.t - COMPRESS_TIME;
    xCompression = xMax * Math.cos(omega * tt);
    phase = "release";
    phaseLabel = `Phase 2 — Oscillation (ω=${omega.toFixed(2)})`;
  }

  const sizeM = spec.objects[0]?.size ?? 0.5;
  const sizePx = sizeM * vp.scale;
  const blockX = L0 - xCompression;
  const yCenter = sizeM / 2;
  const center = toSVG({ x: blockX, y: yCenter }, vp);
  const objId = spec.objects[0]?.id ?? "block";

  const eqX = toSVG({ x: L0, y: yCenter }, vp);
  elements.push({
    id: "equilibrium",
    type: "rope",
    position: { x: eqX.x, y: eqX.y - 70 },
    end: { x: eqX.x, y: eqX.y + 30 },
    meta: { dashed: true },
    label: "x=0",
  });

  elements.push({
    id: "spring",
    type: "spring",
    position: toSVG({ x: 0, y: yCenter }, vp),
    end: toSVG({ x: blockX - sizeM / 2, y: yCenter }, vp),
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

  const wa = makeWorldAxis(vp);
  elements.push({ id: "world_axis", type: "world_axis", ...wa });
  elements.push({
    id: "local_axis",
    type: "local_axis",
    position: center,
    meta: { rotationDeg: 0, length: 32 },
  });

  const objectCenters: Record<string, Vec2> = { [objId]: center };
  const objectLocalRotations: Record<string, number> = { [objId]: 0 };
  const forces: ResolvedForce[] = [];

  const Fspring = k * xCompression;
  if (Math.abs(Fspring) > 0.5) {
    const ap = forceArrowLength(Fspring);
    const sign = Fspring > 0 ? 1 : -1;
    forces.push({
      id: "F_spring", label: "F_ressort",
      magnitude: `${Math.abs(Fspring).toFixed(1)} N`,
      start: center, end: { x: center.x + sign * ap, y: center.y },
      color: FORCE_COLORS.spring, type: "spring", target: objId,
    });
  }

  if (phase === "compression") {
    const Fapp = k * xCompression + 5;
    const ap = forceArrowLength(Fapp);
    forces.push({
      id: "F_app", label: "F_appliquée",
      magnitude: `${Fapp.toFixed(1)} N`,
      start: center, end: { x: center.x - ap, y: center.y },
      color: FORCE_COLORS.applied, type: "applied", target: objId,
    });
  }

  spec.forces.filter((f) => f.target === objId).forEach((f) => {
    let vec: Vec2 = { x: 0, y: 0 };
    if (f.type === "weight") vec = weight(m, g);
    else if (f.type === "normal") vec = { x: 0, y: m * g };
    else if (f.type === "spring" || f.type === "applied") return;
    else if (f.direction) vec = customForce(f.direction, f.value ?? k * xMax);
    const mag = Math.hypot(vec.x, vec.y);
    if (mag < 1e-6) return;
    const ap = forceArrowLength(mag);
    forces.push({
      id: f.id, label: f.label, magnitude: f.magnitude,
      start: center,
      end: { x: center.x + (vec.x / mag) * ap, y: center.y - (vec.y / mag) * ap },
      color: f.color ?? FORCE_COLORS[f.type] ?? FORCE_COLORS.custom,
      type: f.type, target: f.target,
    });
  });

  return { width: W, height: H, elements, forces, objectCenters, objectLocalRotations, phaseLabel };
}

function computeSpringVertical(spec: DiagramSpec, constants: Record<string, number>, frame: AnimationFrame): ResolvedScene {
  const W = 1000;
  const H = 620;
  const g = constants.g ?? 9.81;
  const k = constants.k ?? spec.params.k ?? 50;
  const m = spec.objects[0]?.mass ?? constants.m ?? 1;
  const L0 = spec.params.L ?? constants.L ?? 0.8; // longueur naturelle
  const xMax = spec.params.x ?? constants.x ?? 0.15;

  const scalePx = 240;
  const vp = makeViewport(W, H, scalePx, W / 2, 80);

  const elements: ResolvedElement[] = [];

  // Plafond
  elements.push({
    id: "ceiling",
    type: "ground",
    position: toSVG({ x: -1, y: 0 }, vp),
    end: toSVG({ x: 1, y: 0 }, vp),
  });

  // Allongement statique mg/k + oscillation autour de l'équilibre
  const xEq = (m * g) / k;
  const omega = Math.sqrt(k / m);
  const xOsc = xMax * Math.cos(omega * frame.t);
  const stretch = xEq + xOsc; // distance sous L0

  const sizeM = spec.objects[0]?.size ?? 0.25;
  const sizePx = sizeM * vp.scale;

  // Centre du bloc en physique : y = -(L0 + stretch + sizeM/2)
  const yCenterPhys = -(L0 + stretch + sizeM / 2);
  const center = toSVG({ x: 0, y: yCenterPhys }, vp);
  const objId = spec.objects[0]?.id ?? "block";

  // Position d'équilibre (référence)
  const yEqPhys = -(L0 + xEq + sizeM / 2);
  const eq = toSVG({ x: 0, y: yEqPhys }, vp);
  elements.push({
    id: "equilibrium",
    type: "rope",
    position: { x: eq.x - 70, y: eq.y },
    end: { x: eq.x + 30, y: eq.y },
    meta: { dashed: true },
    label: "x=0",
  });

  // Ressort du plafond au sommet du bloc
  const springTop = toSVG({ x: 0, y: 0 }, vp);
  const springBottom = toSVG({ x: 0, y: -(L0 + stretch) }, vp);
  elements.push({
    id: "spring",
    type: "spring",
    position: springTop,
    end: springBottom,
    meta: { coils: 12, vertical: true },
    label: `k=${k} N/m`,
  });

  elements.push({
    id: objId,
    type: "block",
    position: center,
    size: { w: sizePx, h: sizePx },
    label: spec.objects[0]?.label,
  });

  const wa = makeWorldAxis(vp);
  elements.push({ id: "world_axis", type: "world_axis", ...wa });
  elements.push({
    id: "local_axis",
    type: "local_axis",
    position: center,
    meta: { rotationDeg: 0, length: 32 },
  });

  const objectCenters: Record<string, Vec2> = { [objId]: center };
  const objectLocalRotations: Record<string, number> = { [objId]: 0 };
  const forces: ResolvedForce[] = [];

  // F_ressort = -k*stretch (dirigée vers le haut quand étiré)
  const Fspring = k * stretch;
  if (Math.abs(Fspring) > 0.5) {
    const ap = forceArrowLength(Fspring);
    forces.push({
      id: "F_spring", label: "F_ressort",
      magnitude: `${Fspring.toFixed(1)} N`,
      start: center, end: { x: center.x, y: center.y - ap },
      color: FORCE_COLORS.spring, type: "spring", target: objId,
    });
  }

  spec.forces.filter((f) => f.target === objId).forEach((f) => {
    let vec: Vec2 = { x: 0, y: 0 };
    if (f.type === "weight") vec = weight(m, g);
    else if (f.type === "spring") return;
    else if (f.direction) vec = customForce(f.direction, f.value ?? m * g);
    const mag = Math.hypot(vec.x, vec.y);
    if (mag < 1e-6) return;
    const ap = forceArrowLength(mag);
    forces.push({
      id: f.id, label: f.label, magnitude: f.magnitude,
      start: center,
      end: { x: center.x + (vec.x / mag) * ap, y: center.y - (vec.y / mag) * ap },
      color: f.color ?? FORCE_COLORS[f.type] ?? FORCE_COLORS.custom,
      type: f.type, target: f.target,
    });
  });

  const phaseLabel = `Vertical • ω=${omega.toFixed(2)} rad/s • Δl_eq=${(xEq * 100).toFixed(1)} cm`;
  return { width: W, height: H, elements, forces, objectCenters, objectLocalRotations, phaseLabel };
}

