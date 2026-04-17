import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2 } from "@/types/cognitive";
import { makeViewport, toSVG, deg2rad, forceArrowLength } from "../coords";
import { weight, tensionAlong, FORCE_COLORS } from "../forces";

export function computePendulum(spec: DiagramSpec, constants: Record<string, number>): ResolvedScene {
  const W = 600;
  const H = 480;
  const g = constants.g ?? 9.81;
  const L = spec.params.length ?? constants.L ?? 1.5;
  const angleDeg = spec.params.angle ?? constants.theta ?? 25;
  const a = deg2rad(angleDeg);

  const scalePx = Math.min(120, (H - 160) / Math.max(L + 0.4, 1));
  const vp = makeViewport(W, H, scalePx, W / 2, 80);

  const elements: ResolvedElement[] = [];

  // Plafond
  elements.push({
    id: "ceiling",
    type: "ground",
    position: toSVG({ x: -1.5, y: 0 }, vp),
    end: toSVG({ x: 1.5, y: 0 }, vp),
  });

  const pivot = toSVG({ x: 0, y: 0 }, vp);

  // Position de la masse (angle depuis la verticale)
  const massPhys = { x: L * Math.sin(a), y: -L * Math.cos(a) };
  const center = toSVG(massPhys, vp);

  // Corde / tige
  elements.push({
    id: "arm",
    type: "pendulum_arm",
    position: pivot,
    end: center,
    label: `L = ${L.toFixed(2)} m`,
  });

  // Verticale de référence (pointillée)
  elements.push({
    id: "vertical_ref",
    type: "rope",
    position: pivot,
    end: toSVG({ x: 0, y: -L }, vp),
    meta: { dashed: true },
  });

  // Arc d'angle
  elements.push({
    id: "angle_arc",
    type: "angle_arc",
    position: pivot,
    meta: { angleDeg, radius: 40, fromVertical: true },
    label: `θ=${angleDeg.toFixed(0)}°`,
  });

  const obj = spec.objects[0];
  const m = obj?.mass ?? constants.m ?? 1;
  const sizeM = obj?.size ?? 0.25;
  const sizePx = sizeM * vp.scale;
  const objId = obj?.id ?? "mass";

  elements.push({
    id: objId,
    type: "ball",
    position: center,
    size: { w: sizePx, h: sizePx },
    label: obj?.label,
  });

  const objectCenters: Record<string, Vec2> = { [objId]: center };
  const forces: ResolvedForce[] = [];

  spec.forces.filter((f) => f.target === objId).forEach((f) => {
    let vec: Vec2 = { x: 0, y: 0 };
    if (f.type === "weight") vec = weight(m, g);
    else if (f.type === "tension") {
      // Tension le long de la tige, vers le pivot
      const T = f.value ?? m * g * Math.cos(a);
      vec = tensionAlong(T, massPhys, { x: 0, y: 0 });
    }
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

  return { width: W, height: H, elements, forces, objectCenters };
}
