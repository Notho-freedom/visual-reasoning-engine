import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2, AnimationFrame } from "@/types/cognitive";
import { makeViewport, toSVG, deg2rad, forceArrowLength, makeWorldAxis } from "../coords";
import { weight, normalOnSlope, frictionOnSlope, FORCE_COLORS, customForce } from "../forces";
import { makeTrail, sampleLine, sampleRecentTime } from "../trajectory";

export function computeInclinedPlane(spec: DiagramSpec, constants: Record<string, number>, frame: AnimationFrame): ResolvedScene {
  const W = 1000;
  const H = 620;
  const angleDeg = spec.params.angle ?? constants.alpha ?? 30;
  const slopeLen = spec.params.length ?? 5;
  const g = constants.g ?? 9.81;
  const mu = constants.mu ?? spec.params.mu ?? 0;

  const a = deg2rad(angleDeg);
  const horizExtent = slopeLen * Math.cos(a);
  const vertExtent = slopeLen * Math.sin(a);
  const scalePx = Math.min((W - 280) / Math.max(horizExtent + 1.5, 1), (H - 200) / Math.max(vertExtent + 1, 1));
  const vp = makeViewport(W, H, scalePx, 130, H - 100);

  const elements: ResolvedElement[] = [];

  elements.push({
    id: "ground",
    type: "ground",
    position: toSVG({ x: -0.5, y: 0 }, vp),
    end: toSVG({ x: horizExtent + 1, y: 0 }, vp),
  });

  const slopeBase = toSVG({ x: 0, y: 0 }, vp);
  const slopeFootRight = toSVG({ x: horizExtent, y: 0 }, vp);
  const slopeTop = toSVG({ x: horizExtent, y: vertExtent }, vp);
  elements.push({
    id: "slope",
    type: "slope",
    position: slopeBase,
    end: slopeFootRight,
    meta: {
      x1: slopeBase.x, y1: slopeBase.y,
      x2: slopeFootRight.x, y2: slopeFootRight.y,
      x3: slopeTop.x, y3: slopeTop.y,
      angleDeg,
    },
  });

  elements.push({
    id: "angle_arc",
    type: "angle_arc",
    position: slopeBase,
    meta: { angleDeg, radius: 36 },
    label: `α=${angleDeg.toFixed(0)}°`,
  });

  const wa = makeWorldAxis(vp);
  elements.push({ id: "world_axis", type: "world_axis", ...wa });

  const objectCenters: Record<string, Vec2> = {};
  const objectLocalRotations: Record<string, number> = {};
  const forces: ResolvedForce[] = [];

  spec.objects.forEach((obj) => {
    const m = obj.mass ?? constants.m ?? 1;
    const sizeM = obj.size ?? 0.55;
    const sizePx = sizeM * vp.scale;

    const accel = Math.max(0.05, g * (Math.sin(a) - mu * Math.cos(a)));
    // Toujours partir du HAUT de la pente. On ignore obj.distance fourni par l'IA si farfelu.
    const dStart = Math.max(0.5, slopeLen - 0.5);
    // Distance parcourue depuis le départ (vers le bas le long de la pente)
    const sParcouru = 0.5 * accel * frame.t * frame.t;
    // Position courante depuis le pied de pente, le long de la pente
    const dRestant = Math.max(0.3, dStart - sParcouru);

    const halfDiag = sizeM / 2;
    const centerAtDistance = (d: number) => toSVG({
      x: d * Math.cos(a) + halfDiag * -Math.sin(a),
      y: d * Math.sin(a) + halfDiag * Math.cos(a),
    }, vp);
    const pathStart = centerAtDistance(dStart);
    const pathEnd = centerAtDistance(0.3);
    const theoretical = makeTrail(`path_${obj.id}`, sampleLine(pathStart, pathEnd, 28), "theoretical");
    if (theoretical) elements.push(theoretical);

    const temporal = makeTrail(
      `trail_${obj.id}`,
      sampleRecentTime(frame.t, Math.max(0.25, frame.duration * 0.35), 18, (tt) => {
        const travelled = 0.5 * accel * tt * tt;
        return centerAtDistance(Math.max(0.3, dStart - travelled));
      }),
      "temporal"
    );
    if (temporal) elements.push(temporal);

    // Position du centre du bloc : sur la pente + décalage perpendiculaire (vers le haut de la normale)
    const center = centerAtDistance(dRestant);
    objectCenters[obj.id] = center;
    // Rotation locale = -angleDeg en convention SVG (axes tournés avec la pente)
    objectLocalRotations[obj.id] = angleDeg;

    elements.push({
      id: obj.id,
      type: obj.type === "ball" ? "ball" : "block",
      position: center,
      size: { w: sizePx, h: sizePx },
      rotationDeg: -angleDeg,
      label: obj.label,
      meta: { mass: m },
    });

    elements.push({
      id: `local_axis_${obj.id}`,
      type: "local_axis",
      position: center,
      meta: { rotationDeg: angleDeg, length: 38, labelX: "x'", labelY: "y'" },
    });

    spec.forces.filter((f) => f.target === obj.id).forEach((f) => {
      let vec: Vec2 = { x: 0, y: 0 };
      switch (f.type) {
        case "weight": vec = weight(m, g); break;
        case "normal": vec = normalOnSlope(m, g, angleDeg); break;
        case "friction": {
          vec = frictionOnSlope(m, g, angleDeg, mu || 0.2, "up_slope");
          break;
        }
        case "applied":
        case "custom": {
          const dir = f.direction ?? { x: 1, y: 0 };
          vec = customForce(dir, f.value ?? m * g * 0.5);
          break;
        }
        default:
          if (f.direction) vec = customForce(f.direction, f.value ?? m * g * 0.5);
      }
      const mag = Math.hypot(vec.x, vec.y);
      if (mag < 1e-6) return;
      const arrowPx = forceArrowLength(mag);
      forces.push({
        id: f.id,
        label: f.label,
        magnitude: f.magnitude,
        start: center,
        end: { x: center.x + (vec.x / mag) * arrowPx, y: center.y - (vec.y / mag) * arrowPx },
        color: f.color ?? FORCE_COLORS[f.type] ?? FORCE_COLORS.custom,
        type: f.type,
        target: f.target,
      });
    });
  });

  const accel = g * (Math.sin(a) - mu * Math.cos(a));
  const v = Math.max(0, accel) * frame.t;
  const phaseLabel = `v = ${v.toFixed(2)} m/s   a = ${accel.toFixed(2)} m/s²`;
  return { width: W, height: H, elements, forces, objectCenters, objectLocalRotations, phaseLabel };
}
