import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2, AnimationFrame } from "@/types/cognitive";
import { makeViewport, toSVG, forceArrowLength, makeWorldAxis } from "../coords";
import { weight, FORCE_COLORS } from "../forces";

export function computePulley(spec: DiagramSpec, constants: Record<string, number>, frame: AnimationFrame): ResolvedScene {
  const W = 1000;
  const H = 620;
  const g = constants.g ?? 9.81;
  const ropeLen = spec.params.length ?? 3;

  const scalePx = Math.min(95, (H - 200) / Math.max(ropeLen + 0.8, 1.5));
  const vp = makeViewport(W, H, scalePx, W / 2, H - 90);

  const elements: ResolvedElement[] = [];

  const ceilY = ropeLen + 1;
  elements.push({
    id: "ceiling",
    type: "ground",
    position: toSVG({ x: -3, y: ceilY }, vp),
    end: toSVG({ x: 3, y: ceilY }, vp),
  });

  const pulleyCenter = toSVG({ x: 0, y: ceilY - 0.25 }, vp);
  elements.push({
    id: "pulley",
    type: "pulley",
    position: pulleyCenter,
    size: { w: 44, h: 44 },
    label: "Poulie",
  });

  const m1 = spec.objects[0]?.mass ?? constants.m1 ?? 2;
  const m2 = spec.objects[1]?.mass ?? constants.m2 ?? 3;

  // Accélération du système : a = (m2 - m1) * g / (m1 + m2)
  // Si a > 0 : m2 descend, m1 monte
  const accel = ((m2 - m1) * g) / (m1 + m2);
  const displacement = 0.5 * accel * frame.t * frame.t;
  // Limites pour ne pas sortir du cadre
  const maxDisp = ropeLen * 0.6;
  const dispClamped = Math.max(-maxDisp, Math.min(maxDisp, displacement));

  const sizeM = 0.55;
  const offsetX = 0.5;
  // Position initiale: m1 à mi-hauteur basse, m2 à mi-hauteur basse
  const y1Init = ceilY - 0.25 - ropeLen;
  const y2Init = ceilY - 0.25 - ropeLen * 0.7;

  // m1 monte (+disp), m2 descend (-disp)
  const c1Phys = { x: -offsetX, y: y1Init + dispClamped };
  const c2Phys = { x: offsetX, y: y2Init - dispClamped };

  const c1 = toSVG(c1Phys, vp);
  const c2 = toSVG(c2Phys, vp);

  const ropeAnchor1 = toSVG({ x: -offsetX, y: ceilY - 0.25 }, vp);
  const ropeAnchor2 = toSVG({ x: offsetX, y: ceilY - 0.25 }, vp);
  elements.push({ id: "rope1", type: "rope", position: ropeAnchor1, end: c1 });
  elements.push({ id: "rope2", type: "rope", position: ropeAnchor2, end: c2 });

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

  // Repère monde
  const wa = makeWorldAxis(vp);
  elements.push({ id: "world_axis", type: "world_axis", ...wa });

  // Repères locaux verticaux pour chaque masse
  elements.push({ id: `local_axis_${obj1Id}`, type: "local_axis", position: c1, meta: { rotationDeg: 0, length: 28 } });
  elements.push({ id: `local_axis_${obj2Id}`, type: "local_axis", position: c2, meta: { rotationDeg: 0, length: 28 } });

  const objectCenters: Record<string, Vec2> = { [obj1Id]: c1, [obj2Id]: c2 };
  const forces: ResolvedForce[] = [];

  // Tension commune du système
  const T = (2 * m1 * m2 * g) / (m1 + m2);

  const addForcesFor = (objId: string, mass: number, center: Vec2, anchor: Vec2) => {
    spec.forces.filter((f) => f.target === objId).forEach((f) => {
      let vec: Vec2 = { x: 0, y: 0 };
      if (f.type === "weight") vec = weight(mass, g);
      else if (f.type === "tension") {
        const dx = anchor.x - center.x;
        const dy = anchor.y - center.y;
        const n = Math.hypot(dx, dy);
        if (n > 0) vec = { x: (dx / n) * T, y: -(dy / n) * T };
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

  const v = Math.abs(accel * frame.t);
  const phaseLabel = `a=${accel.toFixed(2)} m/s²  v=${v.toFixed(2)} m/s  T=${T.toFixed(1)}N`;
  return { width: W, height: H, elements, forces, objectCenters, phaseLabel };
}
