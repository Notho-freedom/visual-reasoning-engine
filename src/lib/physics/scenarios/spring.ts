import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2 } from "@/types/cognitive";
import { makeViewport, toSVG, forceArrowLength } from "../coords";
import { weight, springForce, FORCE_COLORS, customForce } from "../forces";

export function computeSpring(spec: DiagramSpec, constants: Record<string, number>): ResolvedScene {
  const W = 700;
  const H = 420;
  const g = constants.g ?? 9.81;
  const k = constants.k ?? spec.params.k ?? 50;
  const x0 = spec.params.x ?? constants.x ?? 0.3; // compression/extension
  const L0 = spec.params.L ?? constants.L ?? 1.5; // longueur naturelle

  const scalePx = 90;
  const vp = makeViewport(W, H, scalePx, 90, H / 2);

  const elements: ResolvedElement[] = [];

  // Sol
  elements.push({
    id: "ground",
    type: "ground",
    position: toSVG({ x: -0.3, y: -0.5 }, vp),
    end: toSVG({ x: L0 + 1.5, y: -0.5 }, vp),
  });

  // Mur gauche
  const wallTop = toSVG({ x: 0, y: 0.8 }, vp);
  const wallBot = toSVG({ x: 0, y: -0.5 }, vp);
  elements.push({
    id: "wall",
    type: "wall",
    position: wallTop,
    end: wallBot,
  });

  // Position du bloc (longueur naturelle ± compression)
  const blockX = L0 + x0;
  const obj = spec.objects[0];
  const m = obj?.mass ?? constants.m ?? 1;
  const sizeM = obj?.size ?? 0.5;
  const sizePx = sizeM * vp.scale;
  const center = toSVG({ x: blockX, y: 0 }, vp);
  const objId = obj?.id ?? "block";

  // Ressort entre mur et bord du bloc
  const springStart = toSVG({ x: 0, y: 0 }, vp);
  const springEnd = toSVG({ x: blockX - sizeM / 2, y: 0 }, vp);
  elements.push({
    id: "spring",
    type: "spring",
    position: springStart,
    end: springEnd,
    meta: { coils: 8 },
    label: `k=${k} N/m`,
  });

  elements.push({
    id: objId,
    type: "block",
    position: center,
    size: { w: sizePx, h: sizePx },
    label: obj?.label,
  });

  if (spec.showAxis !== false) {
    elements.push({
      id: "axis",
      type: "axis",
      position: toSVG({ x: -0.2, y: 0.6 }, vp),
      size: { w: 60, h: 60 },
    });
  }

  const objectCenters: Record<string, Vec2> = { [objId]: center };
  const forces: ResolvedForce[] = [];

  spec.forces.filter((f) => f.target === objId).forEach((f) => {
    let vec: Vec2 = { x: 0, y: 0 };
    if (f.type === "weight") vec = weight(m, g);
    else if (f.type === "spring") vec = springForce(k, x0, { x: 1, y: 0 });
    else if (f.type === "normal") vec = { x: 0, y: m * g };
    else if (f.direction) vec = customForce(f.direction, f.value ?? k * x0);
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
