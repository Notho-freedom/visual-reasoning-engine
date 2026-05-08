import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2, AnimationFrame } from "@/types/cognitive";
import { makeViewport, toSVG, forceArrowLength, makeWorldAxis } from "../coords";
import { weight, normalHorizontal, FORCE_COLORS, customForce } from "../forces";
import { makeTrail, sampleLine, sampleRecentTime } from "../trajectory";

export function computeHorizontalMotion(spec: DiagramSpec, constants: Record<string, number>, frame: AnimationFrame): ResolvedScene {
  const W = 1000;
  const H = 480;
  const g = constants.g ?? 9.81;
  const mu = constants.mu ?? spec.params.mu ?? 0;
  const accelExt = constants.a ?? spec.params.a ?? 2;
  const v0 = constants.v0 ?? spec.params.v0 ?? 0;

  const scalePx = 90;
  const vp = makeViewport(W, H, scalePx, 110, H - 100);

  const elements: ResolvedElement[] = [];

  elements.push({
    id: "ground",
    type: "ground",
    position: toSVG({ x: -0.5, y: 0 }, vp),
    end: toSVG({ x: 9, y: 0 }, vp),
  });

  // Repère monde
  const wa = makeWorldAxis(vp);
  elements.push({ id: "world_axis", type: "world_axis", ...wa });

  const objectCenters: Record<string, Vec2> = {};
  const forces: ResolvedForce[] = [];

  spec.objects.forEach((obj, i) => {
    const m = obj.mass ?? constants.m ?? 1;
    const sizeM = obj.size ?? 0.6;
    const sizePx = sizeM * vp.scale;
    // Position animée: x(t) = x0 + v0·t + 0.5·a·t²
    const xStart = obj.position?.x ?? 0.8 + i * 1.5;
    const xPhys = xStart + v0 * frame.t + 0.5 * accelExt * frame.t * frame.t;
    const xClamped = Math.min(8.5, Math.max(0.5, xPhys));
    const center = toSVG({ x: xClamped, y: sizeM / 2 }, vp);
    objectCenters[obj.id] = center;

    const yCenter = sizeM / 2;
    const direction = Math.sign(accelExt || v0 || 1);
    const pathA = direction >= 0 ? xStart : 0.5;
    const pathB = direction >= 0 ? 8.5 : xStart;
    const theoretical = makeTrail(
      `path_${obj.id}`,
      sampleLine(toSVG({ x: Math.max(0.5, Math.min(8.5, pathA)), y: yCenter }, vp), toSVG({ x: Math.max(0.5, Math.min(8.5, pathB)), y: yCenter }, vp), 24),
      "theoretical"
    );
    if (theoretical) elements.push(theoretical);

    const temporal = makeTrail(
      `trail_${obj.id}`,
      sampleRecentTime(frame.t, Math.max(0.25, frame.duration * 0.35), 18, (tt) => {
        const x = Math.min(8.5, Math.max(0.5, xStart + v0 * tt + 0.5 * accelExt * tt * tt));
        return toSVG({ x, y: yCenter }, vp);
      }),
      "temporal"
    );
    if (temporal) elements.push(temporal);

    elements.push({
      id: obj.id,
      type: "block",
      position: center,
      size: { w: sizePx, h: sizePx },
      label: obj.label,
    });

    // Repère local
    elements.push({
      id: `local_axis_${obj.id}`,
      type: "local_axis",
      position: center,
      meta: { rotationDeg: 0, length: 32 },
    });

    spec.forces.filter((f) => f.target === obj.id).forEach((f) => {
      let vec: Vec2 = { x: 0, y: 0 };
      if (f.type === "weight") vec = weight(m, g);
      else if (f.type === "normal") vec = normalHorizontal(m, g);
      else if (f.type === "friction") {
        const ff = mu * m * g;
        // frottement opposé au mouvement (ici vers la gauche si on va à droite)
        vec = { x: -Math.sign(accelExt || 1) * ff, y: 0 };
      } else if (f.direction) vec = customForce(f.direction, f.value ?? m * g);
      else if (f.type === "applied") vec = { x: f.value ?? m * accelExt, y: 0 };

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

  const v = v0 + accelExt * frame.t;
  const phaseLabel = `v=${v.toFixed(2)} m/s  a=${accelExt.toFixed(2)} m/s²`;
  return { width: W, height: H, elements, forces, objectCenters, phaseLabel };
}
