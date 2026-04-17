import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2 } from "@/types/cognitive";
import { makeViewport, toSVG, forceArrowLength } from "../coords";
import { weight, normalHorizontal, FORCE_COLORS, customForce } from "../forces";

export function computeHorizontalMotion(spec: DiagramSpec, constants: Record<string, number>): ResolvedScene {
  const W = 700;
  const H = 380;
  const g = constants.g ?? 9.81;
  const mu = constants.mu ?? spec.params.mu ?? 0;

  const scalePx = 80;
  const vp = makeViewport(W, H, scalePx, 60, H - 80);

  const elements: ResolvedElement[] = [];

  elements.push({
    id: "ground",
    type: "ground",
    position: toSVG({ x: -0.5, y: 0 }, vp),
    end: toSVG({ x: 7, y: 0 }, vp),
  });

  if (spec.showAxis !== false) {
    elements.push({
      id: "axis",
      type: "axis",
      position: toSVG({ x: -0.2, y: 0.4 }, vp),
      size: { w: 60, h: 60 },
    });
  }

  const objectCenters: Record<string, Vec2> = {};
  const forces: ResolvedForce[] = [];

  spec.objects.forEach((obj, i) => {
    const m = obj.mass ?? constants.m ?? 1;
    const sizeM = obj.size ?? 0.6;
    const sizePx = sizeM * vp.scale;
    const xPhys = obj.position?.x ?? 1.5 + i * 1.5;
    const center = toSVG({ x: xPhys, y: sizeM / 2 }, vp);
    objectCenters[obj.id] = center;

    elements.push({
      id: obj.id,
      type: "block",
      position: center,
      size: { w: sizePx, h: sizePx },
      label: obj.label,
    });

    spec.forces.filter((f) => f.target === obj.id).forEach((f) => {
      let vec: Vec2 = { x: 0, y: 0 };
      if (f.type === "weight") vec = weight(m, g);
      else if (f.type === "normal") vec = normalHorizontal(m, g);
      else if (f.type === "friction") {
        const ff = mu * m * g;
        const dir = f.orientation === "up_slope" ? 1 : -1;
        vec = { x: dir * ff, y: 0 };
      } else if (f.direction) vec = customForce(f.direction, f.value ?? m * g);
      else if (f.type === "applied" && !f.direction) vec = { x: f.value ?? m * 2, y: 0 };

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
  });

  return { width: W, height: H, elements, forces, objectCenters };
}
