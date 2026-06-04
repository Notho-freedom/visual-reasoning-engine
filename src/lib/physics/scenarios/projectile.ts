import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2, AnimationFrame } from "@/types/cognitive";
import { makeViewport, toSVG, deg2rad, forceArrowLength, makeWorldAxis } from "../coords";
import { weight, customForce, FORCE_COLORS } from "../forces";
import { makeTrail } from "../trajectory";

export function computeProjectile(spec: DiagramSpec, constants: Record<string, number>, frame: AnimationFrame): ResolvedScene {
  const W = 1000;
  const H = 600;
  const v0 = spec.params.v0 ?? constants.v0 ?? 20;
  const thetaDeg = spec.params.theta ?? constants.theta ?? 45;
  const g = constants.g ?? 9.81;
  const h0 = spec.params.h0 ?? constants.h0 ?? 0;
  const t = deg2rad(thetaDeg);
  const vx0 = v0 * Math.cos(t);
  const vy0 = v0 * Math.sin(t);
  // Temps de vol résolvant y(t) = h0 + vy0*t - 0.5*g*t² = 0
  const disc = vy0 * vy0 + 2 * g * h0;
  const tFlight = (vy0 + Math.sqrt(Math.max(disc, 0))) / g;
  const range = vx0 * tFlight;
  const maxH = h0 + (vy0 * vy0) / (2 * g);

  const scalePx = Math.min((W - 200) / Math.max(range + 1, 1), (H - 160) / Math.max(maxH + 1, 1));
  const vp = makeViewport(W, H, scalePx, 90, H - 90);

  const elements: ResolvedElement[] = [];

  elements.push({
    id: "ground",
    type: "ground",
    position: toSVG({ x: -1, y: 0 }, vp),
    end: toSVG({ x: range + 2, y: 0 }, vp),
  });

  // Repère monde
  const wa = makeWorldAxis(vp);
  elements.push({ id: "world_axis", type: "world_axis", ...wa });

  // Plateforme de tir si h0 > 0
  if (h0 > 0.01) {
    elements.push({
      id: "platform",
      type: "wall",
      position: toSVG({ x: -0.4, y: 0 }, vp),
      end: toSVG({ x: -0.4, y: h0 }, vp),
    });
    elements.push({
      id: "platform_top",
      type: "ground",
      position: toSVG({ x: -0.6, y: h0 }, vp),
      end: toSVG({ x: 0.2, y: h0 }, vp),
    });
    elements.push({
      id: "h0_dim",
      type: "dimension",
      position: toSVG({ x: -1.0, y: 0 }, vp),
      end: toSVG({ x: -1.0, y: h0 }, vp),
      label: `h₀ = ${h0.toFixed(1)} m`,
    });
  }

  // Trajectoire complète (en arrière-plan, tracé fin)
  const trajPath: Vec2[] = [];
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const tt = (i / N) * tFlight;
    const x = vx0 * tt;
    const y = h0 + vy0 * tt - 0.5 * g * tt * tt;
    trajPath.push(toSVG({ x, y }, vp));
  }
  elements.push({
    id: "traj",
    type: "projectile_path",
    position: trajPath[0],
    end: trajPath[trajPath.length - 1],
    meta: { points: JSON.stringify(trajPath), variant: "theoretical" },
    label: `R = ${range.toFixed(1)} m`,
  });
  const theoretical = makeTrail("projectile_theoretical_path", trajPath, "theoretical");
  if (theoretical) elements.push(theoretical);

  // Trace progressive
  const animT = Math.min(frame.t, tFlight);
  if (animT > 0.02) {
    const trail: Vec2[] = [];
    const M = 40;
    for (let i = 0; i <= M; i++) {
      const tt = (i / M) * animT;
      const x = vx0 * tt;
      const y = h0 + vy0 * tt - 0.5 * g * tt * tt;
      trail.push(toSVG({ x, y }, vp));
    }
    elements.push({
      id: "projectile_temporal_trail",
      type: "trail",
      position: trail[0],
      end: trail[trail.length - 1],
      meta: { points: JSON.stringify(trail), variant: "temporal" },
    });
  }

  if (Math.abs(thetaDeg) > 0.5) {
    elements.push({
      id: "angle_arc",
      type: "angle_arc",
      position: toSVG({ x: 0, y: h0 }, vp),
      meta: { angleDeg: thetaDeg, radius: 40 },
      label: `θ=${thetaDeg.toFixed(0)}°`,
    });
  }

  const objectCenters: Record<string, Vec2> = {};
  const forces: ResolvedForce[] = [];

  const obj = spec.objects[0];
  if (obj) {
    const m = obj.mass ?? constants.m ?? 1;
    const sizePx = (obj.size ?? 0.4) * vp.scale;
    const xPos = vx0 * animT;
    const yPos = Math.max(0, h0 + vy0 * animT - 0.5 * g * animT * animT);
    const center = toSVG({ x: xPos, y: yPos }, vp);
    objectCenters[obj.id] = center;
    elements.push({
      id: obj.id,
      type: "ball",
      position: center,
      size: { w: sizePx, h: sizePx },
      label: obj.label,
    });

    // Vecteur vitesse instantanée
    const vx = vx0;
    const vy = vy0 - g * animT;
    const vmag = Math.hypot(vx, vy);
    if (vmag > 0.5 && animT < tFlight) {
      const vpx = Math.min(110, 50 + vmag * 1.6);
      forces.push({
        id: "v",
        label: "v",
        magnitude: `${vmag.toFixed(1)} m/s`,
        start: center,
        end: { x: center.x + (vx / vmag) * vpx, y: center.y - (vy / vmag) * vpx },
        color: "hsl(195 80% 60%)",
        type: "applied",
        target: obj.id,
      });
    }

    // Forces (poids, traînée…)
    spec.forces.filter((f) => f.target === obj.id).forEach((f) => {
      let vec: Vec2 = { x: 0, y: 0 };
      if (f.type === "weight") vec = weight(m, g);
      else if (f.type === "drag" || f.type === "friction") {
        // opposée à la vitesse
        const vMag = Math.hypot(vx, vy);
        if (vMag > 1e-6) {
          const mag = f.value ?? 1;
          vec = { x: -(vx / vMag) * mag * 50, y: -(vy / vMag) * mag * 50 };
        }
      }
      else if (f.direction) vec = customForce(f.direction, f.value ?? m * g);
      const mag = Math.hypot(vec.x, vec.y);
      if (mag < 1e-6) return;
      const ap = forceArrowLength(mag);
      forces.push({
        id: f.id,
        label: f.label,
        magnitude: f.magnitude ?? (f.value ? `${f.value.toFixed(2)} N` : undefined),
        start: center,
        end: { x: center.x + (vec.x / mag) * ap, y: center.y - (vec.y / mag) * ap },
        color: f.color ?? FORCE_COLORS[f.type] ?? FORCE_COLORS.custom,
        type: f.type,
        target: f.target,
      });
    });
  }

  const phaseLabel = animT >= tFlight ? "Impact" : `t = ${animT.toFixed(2)}s`;
  return { width: W, height: H, elements, forces, objectCenters, phaseLabel };
}
