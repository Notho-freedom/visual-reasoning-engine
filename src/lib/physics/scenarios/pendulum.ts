import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2, AnimationFrame } from "@/types/cognitive";
import { makeViewport, toSVG, deg2rad, forceArrowLength, makeWorldAxis } from "../coords";
import { weight, tensionAlong, FORCE_COLORS } from "../forces";

export function computePendulum(spec: DiagramSpec, constants: Record<string, number>, frame: AnimationFrame): ResolvedScene {
  const W = 1000;
  const H = 620;
  const g = constants.g ?? 9.81;
  const L = spec.params.length ?? constants.L ?? 1.5;
  const angleDeg0 = spec.params.angle ?? constants.theta ?? 25;
  const a0 = deg2rad(angleDeg0);

  // Oscillation θ(t) = θ₀·cos(ω·t), ω = √(g/L)
  const omega = Math.sqrt(g / L);
  const aNow = a0 * Math.cos(omega * frame.t);
  const angleDegNow = (aNow * 180) / Math.PI;

  const scalePx = Math.min(180, (H - 200) / Math.max(L + 0.4, 1));
  const vp = makeViewport(W, H, scalePx, W / 2, 110);

  const elements: ResolvedElement[] = [];

  // Plafond
  elements.push({
    id: "ceiling",
    type: "ground",
    position: toSVG({ x: -2, y: 0 }, vp),
    end: toSVG({ x: 2, y: 0 }, vp),
  });

  const pivot = toSVG({ x: 0, y: 0 }, vp);
  const massPhys = { x: L * Math.sin(aNow), y: -L * Math.cos(aNow) };
  const center = toSVG(massPhys, vp);

  // Tige
  elements.push({
    id: "arm",
    type: "pendulum_arm",
    position: pivot,
    end: center,
    label: `L = ${L.toFixed(2)} m`,
  });

  // Verticale de référence
  elements.push({
    id: "vertical_ref",
    type: "rope",
    position: pivot,
    end: toSVG({ x: 0, y: -L }, vp),
    meta: { dashed: true },
  });

  // Arc d'angle (depuis verticale)
  if (Math.abs(angleDegNow) > 1) {
    elements.push({
      id: "angle_arc",
      type: "angle_arc",
      position: pivot,
      meta: { angleDeg: Math.abs(angleDegNow), radius: 45, fromVertical: true },
      label: `θ=${angleDegNow.toFixed(0)}°`,
    });
  }

  const obj = spec.objects[0];
  const m = obj?.mass ?? constants.m ?? 1;
  const sizeM = obj?.size ?? 0.28;
  const sizePx = sizeM * vp.scale;
  const objId = obj?.id ?? "mass";

  elements.push({
    id: objId,
    type: "ball",
    position: center,
    size: { w: sizePx, h: sizePx },
    label: obj?.label,
  });

  // Repère MONDE
  const wa = makeWorldAxis(vp);
  elements.push({ id: "world_axis", type: "world_axis", ...wa });

  // Repère LOCAL : tangentiel (perpendiculaire à la corde) + radial
  // Rotation du repère local : axes tournés de l'angle aNow (rad)
  elements.push({
    id: "local_axis",
    type: "local_axis",
    position: center,
    meta: { rotationDeg: -angleDegNow, length: 38, labelX: "t", labelY: "n" },
  });

  const objectCenters: Record<string, Vec2> = { [objId]: center };
  const forces: ResolvedForce[] = [];

  spec.forces.filter((f) => f.target === objId).forEach((f) => {
    let vec: Vec2 = { x: 0, y: 0 };
    if (f.type === "weight") vec = weight(m, g);
    else if (f.type === "tension") {
      const T = m * g * Math.cos(aNow) + (m * L * omega * omega * a0 * a0 * Math.sin(omega * frame.t) ** 2);
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

  const phaseLabel = `θ=${angleDegNow.toFixed(1)}°  T=${((2 * Math.PI) / omega).toFixed(2)}s`;
  return { width: W, height: H, elements, forces, objectCenters, phaseLabel };
}
