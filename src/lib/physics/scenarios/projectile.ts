import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2 } from "@/types/cognitive";
import { makeViewport, toSVG, deg2rad, forceArrowLength } from "../coords";
import { weight, customForce, FORCE_COLORS } from "../forces";

export function computeProjectile(spec: DiagramSpec, constants: Record<string, number>): ResolvedScene {
  const W = 720;
  const H = 460;
  const v0 = spec.params.v0 ?? constants.v0 ?? 20;
  const thetaDeg = spec.params.theta ?? constants.theta ?? 45;
  const g = constants.g ?? 9.81;
  const t = deg2rad(thetaDeg);
  const range = (v0 * v0 * Math.sin(2 * t)) / g;
  const maxH = (v0 * v0 * Math.sin(t) ** 2) / (2 * g);

  const scalePx = Math.min((W - 140) / Math.max(range, 1), (H - 130) / Math.max(maxH, 1));
  const vp = makeViewport(W, H, scalePx, 70, H - 70);

  const elements: ResolvedElement[] = [];

  elements.push({
    id: "ground",
    type: "ground",
    position: toSVG({ x: -1, y: 0 }, vp),
    end: toSVG({ x: range + 1, y: 0 }, vp),
  });

  if (spec.showAxis !== false) {
    elements.push({
      id: "axis",
      type: "axis",
      position: toSVG({ x: 0, y: 0 }, vp),
      size: { w: 60, h: 60 },
    });
  }

  // Trajectoire échantillonnée (parabolique)
  const trajPath: Vec2[] = [];
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const tt = (i / N) * ((2 * v0 * Math.sin(t)) / g);
    const x = v0 * Math.cos(t) * tt;
    const y = v0 * Math.sin(t) * tt - 0.5 * g * tt * tt;
    trajPath.push(toSVG({ x, y }, vp));
  }
  elements.push({
    id: "traj",
    type: "projectile_path",
    position: trajPath[0],
    end: trajPath[trajPath.length - 1],
    meta: { points: JSON.stringify(trajPath) },
    label: `R = ${range.toFixed(1)} m`,
  });

  // Arc angle initial
  elements.push({
    id: "angle_arc",
    type: "angle_arc",
    position: toSVG({ x: 0, y: 0 }, vp),
    meta: { angleDeg: thetaDeg, radius: 36 },
    label: `θ=${thetaDeg.toFixed(0)}°`,
  });

  const objectCenters: Record<string, Vec2> = {};
  const forces: ResolvedForce[] = [];

  // Objet au point de tir
  const obj = spec.objects[0];
  if (obj) {
    const m = obj.mass ?? constants.m ?? 1;
    const sizePx = (obj.size ?? 0.4) * vp.scale;
    const center = toSVG({ x: 0, y: 0 }, vp);
    objectCenters[obj.id] = center;
    elements.push({
      id: obj.id,
      type: "ball",
      position: center,
      size: { w: sizePx, h: sizePx },
      label: obj.label,
    });

    // Vecteur v0
    const v0Px = Math.min(110, 60 + v0 * 1.5);
    forces.push({
      id: "v0",
      label: "v₀",
      magnitude: `${v0.toFixed(1)} m/s`,
      start: center,
      end: { x: center.x + Math.cos(t) * v0Px, y: center.y - Math.sin(t) * v0Px },
      color: "hsl(195, 80%, 60%)",
      type: "applied",
      target: obj.id,
    });

    // Forces (poids principalement)
    spec.forces.filter((f) => f.target === obj.id).forEach((f) => {
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
  }

  return { width: W, height: H, elements, forces, objectCenters };
}
