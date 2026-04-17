import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2 } from "@/types/cognitive";
import { makeViewport, toSVG, forceArrowLength } from "../coords";
import { weight, FORCE_COLORS } from "../forces";

export function computePulley(spec: DiagramSpec, constants: Record<string, number>): ResolvedScene {
  const W = 680;
  const H = 480;
  const g = constants.g ?? 9.81;
  const ropeLen = spec.params.length ?? 3;

  const scalePx = Math.min(70, (H - 160) / Math.max(ropeLen + 0.5, 1.5));
  const vp = makeViewport(W, H, scalePx, W / 2, H - 70);

  const elements: ResolvedElement[] = [];

  // Plafond (supporte la poulie)
  const ceilY = ropeLen + 1;
  elements.push({
    id: "ceiling",
    type: "ground",
    position: toSVG({ x: -2.5, y: ceilY }, vp),
    end: toSVG({ x: 2.5, y: ceilY }, vp),
  });

  // Poulie
  const pulleyCenter = toSVG({ x: 0, y: ceilY - 0.25 }, vp);
  elements.push({
    id: "pulley",
    type: "pulley",
    position: pulleyCenter,
    size: { w: 36, h: 36 },
    label: "Poulie",
  });

  const m1 = spec.objects[0]?.mass ?? constants.m1 ?? 2;
  const m2 = spec.objects[1]?.mass ?? constants.m2 ?? 3;

  // Positions des deux masses (de chaque côté de la poulie)
  const sizeM = 0.5;
  const offsetX = 0.4;
  const c1Phys = { x: -offsetX, y: ceilY - 0.25 - ropeLen };
  const c2Phys = { x: offsetX, y: ceilY - 0.25 - ropeLen * 0.7 };

  const c1 = toSVG(c1Phys, vp);
  const c2 = toSVG(c2Phys, vp);

  // Cordes (de la poulie vers chaque masse)
  const ropeAnchor1 = toSVG({ x: -offsetX, y: ceilY - 0.25 }, vp);
  const ropeAnchor2 = toSVG({ x: offsetX, y: ceilY - 0.25 }, vp);
  elements.push({
    id: "rope1",
    type: "rope",
    position: ropeAnchor1,
    end: c1,
  });
  elements.push({
    id: "rope2",
    type: "rope",
    position: ropeAnchor2,
    end: c2,
  });

  const sizePx = sizeM * vp.scale;
  const obj1Id = spec.objects[0]?.id ?? "m1";
  const obj2Id = spec.objects[1]?.id ?? "m2";

  elements.push({
    id: obj1Id,
    type: "block",
    position: c1,
    size: { w: sizePx, h: sizePx },
    label: spec.objects[0]?.label ?? `m₁=${m1}kg`,
  });
  elements.push({
    id: obj2Id,
    type: "block",
    position: c2,
    size: { w: sizePx, h: sizePx },
    label: spec.objects[1]?.label ?? `m₂=${m2}kg`,
  });

  const objectCenters: Record<string, Vec2> = { [obj1Id]: c1, [obj2Id]: c2 };
  const forces: ResolvedForce[] = [];

  const addForcesFor = (objId: string, mass: number, center: Vec2, anchor: Vec2) => {
    spec.forces.filter((f) => f.target === objId).forEach((f) => {
      let vec: Vec2 = { x: 0, y: 0 };
      if (f.type === "weight") vec = weight(mass, g);
      else if (f.type === "tension") {
        // Tension dirigée du bloc vers l'ancrage
        const dx = anchor.x - center.x;
        const dy = anchor.y - center.y;
        const n = Math.hypot(dx, dy);
        const T = f.value ?? mass * g; // approx
        if (n > 0) vec = { x: (dx / n) * T, y: -(dy / n) * T }; // -dy car physique Y-up
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
  };

  addForcesFor(obj1Id, m1, c1, ropeAnchor1);
  addForcesFor(obj2Id, m2, c2, ropeAnchor2);

  return { width: W, height: H, elements, forces, objectCenters };
}
