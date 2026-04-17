import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2 } from "@/types/cognitive";
import { makeViewport, toSVG, forceArrowLength } from "../coords";
import { weight, customForce, FORCE_COLORS } from "../forces";

export function computeFreeFall(spec: DiagramSpec, constants: Record<string, number>): ResolvedScene {
  const W = 600;
  const H = 480;
  const h = spec.params.height ?? constants.h ?? 10;
  const g = constants.g ?? 9.81;

  const scalePx = Math.min((H - 140) / Math.max(h, 1), 40);
  const vp = makeViewport(W, H, scalePx, W / 2, H - 70);

  const elements: ResolvedElement[] = [];

  // Sol
  elements.push({
    id: "ground",
    type: "ground",
    position: toSVG({ x: -5, y: 0 }, vp),
    end: toSVG({ x: 5, y: 0 }, vp),
  });

  // Axes
  if (spec.showAxis !== false) {
    elements.push({
      id: "axis",
      type: "axis",
      position: toSVG({ x: -3.5, y: 0.5 }, vp),
      size: { w: 60, h: 80 },
    });
  }

  // Cote hauteur
  elements.push({
    id: "h_dim",
    type: "dimension",
    position: toSVG({ x: 1.5, y: 0 }, vp),
    end: toSVG({ x: 1.5, y: h }, vp),
    label: `h = ${h.toFixed(1)} m`,
  });

  const objectCenters: Record<string, Vec2> = {};
  const forces: ResolvedForce[] = [];

  spec.objects.forEach((obj, i) => {
    const m = obj.mass ?? constants.m ?? 1;
    const sizeM = obj.size ?? 0.5;
    const sizePx = sizeM * vp.scale;

    // Position : par défaut au sommet, sinon position absolue
    const yPhys = obj.position?.y ?? h - i * 0.5;
    const xPhys = obj.position?.x ?? 0;
    const center = toSVG({ x: xPhys, y: yPhys }, vp);
    objectCenters[obj.id] = center;

    elements.push({
      id: obj.id,
      type: obj.type === "block" ? "block" : "ball",
      position: center,
      size: { w: sizePx, h: sizePx },
      label: obj.label,
      meta: { mass: m },
    });

    spec.forces
      .filter((f) => f.target === obj.id)
      .forEach((f) => {
        let vec: Vec2 = { x: 0, y: 0 };
        if (f.type === "weight") vec = weight(m, g);
        else if (f.direction) vec = customForce(f.direction, f.value ?? m * g);

        const mag = Math.hypot(vec.x, vec.y);
        if (mag < 1e-6) return;
        const arrowPx = forceArrowLength(mag);
        const end: Vec2 = {
          x: center.x + (vec.x / mag) * arrowPx,
          y: center.y - (vec.y / mag) * arrowPx,
        };

        forces.push({
          id: f.id,
          label: f.label,
          magnitude: f.magnitude,
          start: center,
          end,
          color: f.color ?? FORCE_COLORS[f.type] ?? FORCE_COLORS.custom,
          type: f.type,
          target: f.target,
        });
      });
  });

  return { width: W, height: H, elements, forces, objectCenters };
}
