import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2, AnimationFrame } from "@/types/cognitive";
import { makeViewport, toSVG, forceArrowLength, makeWorldAxis } from "../coords";
import { weight, customForce, FORCE_COLORS } from "../forces";
import { makeTrail, sampleLine, sampleRecentTime } from "../trajectory";

export function computeFreeFall(spec: DiagramSpec, constants: Record<string, number>, frame: AnimationFrame): ResolvedScene {
  const W = 1000;
  const H = 620;
  const h = spec.params.height ?? constants.h ?? 10;
  const g = constants.g ?? 9.81;

  const scalePx = Math.min((H - 160) / Math.max(h, 1), 50);
  const vp = makeViewport(W, H, scalePx, W / 2, H - 80);

  const elements: ResolvedElement[] = [];

  // Sol
  elements.push({
    id: "ground",
    type: "ground",
    position: toSVG({ x: -8, y: 0 }, vp),
    end: toSVG({ x: 8, y: 0 }, vp),
  });

  // Repère monde
  const wa = makeWorldAxis(vp);
  elements.push({ id: "world_axis", type: "world_axis", ...wa });

  // Cote hauteur
  elements.push({
    id: "h_dim",
    type: "dimension",
    position: toSVG({ x: 1.8, y: 0 }, vp),
    end: toSVG({ x: 1.8, y: h }, vp),
    label: `h = ${h.toFixed(1)} m`,
  });

  // Position animée
  // y(t) = h - 0.5*g*t² (clampé à 0)
  const yPos = Math.max(0, h - 0.5 * g * frame.t * frame.t);
  const v = Math.min(g * frame.t, Math.sqrt(2 * g * h));

  const objectCenters: Record<string, Vec2> = {};
  const forces: ResolvedForce[] = [];

  const obj = spec.objects[0];
  const m = obj?.mass ?? constants.m ?? 1;
  const sizeM = obj?.size ?? 0.5;
  const sizePx = sizeM * vp.scale;
  const objId = obj?.id ?? "object";

  const center = toSVG({ x: 0, y: yPos + sizeM / 2 }, vp);
  objectCenters[objId] = center;

  const theoretical = makeTrail(
    "freefall_theoretical_path",
    sampleLine(toSVG({ x: 0, y: h + sizeM / 2 }, vp), toSVG({ x: 0, y: sizeM / 2 }, vp), 24),
    "theoretical"
  );
  if (theoretical) elements.push(theoretical);

  const temporal = makeTrail(
    "freefall_temporal_trail",
    sampleRecentTime(frame.t, Math.max(0.25, frame.duration * 0.35), 20, (tt) => {
      const yy = Math.max(0, h - 0.5 * g * tt * tt);
      return toSVG({ x: 0, y: yy + sizeM / 2 }, vp);
    }),
    "temporal"
  );
  if (temporal) elements.push(temporal);

  elements.push({
    id: objId,
    type: obj?.type === "block" ? "block" : "ball",
    position: center,
    size: { w: sizePx, h: sizePx },
    label: obj?.label,
    meta: { mass: m },
  });

  // Repère local au centre de la masse
  elements.push({
    id: "local_axis",
    type: "local_axis",
    position: center,
    meta: { rotationDeg: 0, length: 28 },
  });

  // Forces (poids visible tout le temps)
  spec.forces.filter((f) => f.target === objId).forEach((f) => {
    let vec: Vec2 = { x: 0, y: 0 };
    if (f.type === "weight") vec = weight(m, g);
    else if (f.direction) vec = customForce(f.direction, f.value ?? m * g);
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

  const phaseLabel = yPos <= 0.001 ? "Impact" : `v = ${v.toFixed(2)} m/s`;
  return { width: W, height: H, elements, forces, objectCenters, phaseLabel };
}
