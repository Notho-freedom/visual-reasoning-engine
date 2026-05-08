import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2, AnimationFrame } from "@/types/cognitive";
import { makeViewport, toSVG, deg2rad, forceArrowLength, makeWorldAxis } from "../coords";
import { weight, normalOnSlope, FORCE_COLORS } from "../forces";
import { makeTrail, sampleLine, sampleRecentTime } from "../trajectory";

/**
 * SYSTÈME COMBINÉ : plan incliné + poulie au sommet + masse suspendue.
 * - m1 sur la pente, relié par une corde à m2 qui pend verticalement
 * - Convention: si a > 0 → m1 monte la pente (et m2 descend).
 *               si a < 0 → m1 descend la pente (et m2 monte).
 *   a = (m2·g - m1·g·sinα - μ·m1·g·cosα·sign(direction)) / (m1+m2)
 *   On choisit le sens de glissement par tendance : si m2·g > m1·g·sinα → m1 monte.
 */
export function computeInclinedPulley(spec: DiagramSpec, constants: Record<string, number>, frame: AnimationFrame): ResolvedScene {
  const W = 1100;
  const H = 640;
  const g = constants.g ?? 9.81;
  const angleDeg = spec.params.angle ?? constants.alpha ?? 30;
  const slopeLen = spec.params.length ?? 4.5;
  const mu = constants.mu ?? spec.params.mu ?? 0;
  const m1 = spec.objects[0]?.mass ?? constants.m1 ?? constants.m ?? 2;
  const m2 = spec.objects[1]?.mass ?? constants.m2 ?? 1;

  const a = deg2rad(angleDeg);
  const horizExtent = slopeLen * Math.cos(a);
  const vertExtent = slopeLen * Math.sin(a);
  const m2HangLen = 1.4; // longueur de pendaison m2 max

  const scalePx = Math.min(
    (W - 360) / Math.max(horizExtent + 2.5, 1),
    (H - 220) / Math.max(vertExtent + m2HangLen + 1, 1)
  );
  const vp = makeViewport(W, H, scalePx, 130, H - 100);

  const elements: ResolvedElement[] = [];

  // Sol
  elements.push({
    id: "ground",
    type: "ground",
    position: toSVG({ x: -0.5, y: 0 }, vp),
    end: toSVG({ x: horizExtent + 2, y: 0 }, vp),
  });

  // Pente
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

  // Poulie au SOMMET de la pente, légèrement décalée vers la droite
  const pulleyPhys = { x: horizExtent + 0.25, y: vertExtent + 0.25 };
  const pulleyCenter = toSVG(pulleyPhys, vp);
  elements.push({
    id: "pulley",
    type: "pulley",
    position: pulleyCenter,
    size: { w: 36, h: 36 },
    label: "P",
  });

  // === Mouvement ===
  // Force motrice nette = m2·g - m1·g·sinα ; frottement opposé au mouvement.
  const drivingNoFriction = m2 * g - m1 * g * Math.sin(a);
  const direction = Math.sign(drivingNoFriction); // +1 → m1 monte, -1 → m1 descend
  const friction = mu * m1 * g * Math.cos(a);
  const accelMag = Math.max(0, Math.abs(drivingNoFriction) - friction) / (m1 + m2);
  const movement = direction !== 0 && accelMag > 0;
  const accelSigned = direction * accelMag;

  // Position le long de la pente (depuis le bas)
  const dStart = Math.max(1.0, slopeLen - 0.6);
  let dCurrent = dStart;
  if (movement) {
    const s = 0.5 * accelMag * frame.t * frame.t;
    if (direction > 0) {
      // m1 monte → distance depuis le bas augmente
      dCurrent = Math.min(slopeLen - 0.3, dStart + s);
    } else {
      // m1 descend → distance depuis le bas diminue
      dCurrent = Math.max(0.3, dStart - s);
    }
  }
  // Distance courante effectivement parcourue par m1 (signée selon direction)
  const sActual = direction > 0 ? dCurrent - dStart : dStart - dCurrent;

  // Position du centre de m1 sur la pente
  const sizeM1 = spec.objects[0]?.size ?? 0.5;
  const sizeM2 = spec.objects[1]?.size ?? 0.45;
  const halfDiag1 = sizeM1 / 2;
  const c1AtDistance = (distance: number) => toSVG({
    x: distance * Math.cos(a) + halfDiag1 * -Math.sin(a),
    y: distance * Math.sin(a) + halfDiag1 * Math.cos(a),
  }, vp);
  const c1 = c1AtDistance(dCurrent);

  const m1PathStart = direction >= 0 ? dStart : 0.3;
  const m1PathEnd = direction >= 0 ? slopeLen - 0.3 : dStart;
  const m1Path = makeTrail("inclined_pulley_m1_theoretical_path", sampleLine(c1AtDistance(m1PathStart), c1AtDistance(m1PathEnd), 28), "theoretical");
  if (m1Path) elements.push(m1Path);
  const m1Trail = makeTrail(
    "inclined_pulley_m1_temporal_trail",
    sampleRecentTime(frame.t, Math.max(0.25, frame.duration * 0.35), 18, (tt) => {
      const s = movement ? 0.5 * accelMag * tt * tt : 0;
      const d = direction > 0
        ? Math.min(slopeLen - 0.3, dStart + s)
        : Math.max(0.3, dStart - s);
      return c1AtDistance(d);
    }),
    "temporal"
  );
  if (m1Trail) elements.push(m1Trail);

  // Corde de m1 → poulie (le long de la pente)
  // Point d'accroche sur le bloc côté haut de la pente
  const m1AnchorPhys = {
    x: dCurrent * Math.cos(a),
    y: dCurrent * Math.sin(a),
  };
  const m1Anchor = toSVG(m1AnchorPhys, vp);
  elements.push({
    id: "rope_slope",
    type: "rope",
    position: m1Anchor,
    end: pulleyCenter,
  });

  // m2 pend verticalement sous la poulie. Quand m1 monte (direction>0) m2 descend.
  // Longueur initiale de pendaison
  const m2HangInit = 0.7;
  // Si m1 a parcouru sActual sur la pente, m2 a descendu de sActual (corde inextensible)
  const m2HangCurrent = Math.max(0.3, Math.min(m2HangLen, m2HangInit + (direction > 0 ? sActual : -sActual)));
  const m2TopPhys = { x: pulleyPhys.x + 0.6, y: pulleyPhys.y - 0.05 };
  const m2BottomPhys = { x: pulleyPhys.x + 0.6, y: pulleyPhys.y - m2HangCurrent };
  const m2Top = toSVG(m2TopPhys, vp);
  const c2 = toSVG({ x: m2BottomPhys.x, y: m2BottomPhys.y - sizeM2 / 2 }, vp);
  const c2AtHang = (hang: number) => toSVG({ x: m2TopPhys.x, y: m2TopPhys.y - hang - sizeM2 / 2 }, vp);
  const m2Path = makeTrail("inclined_pulley_m2_theoretical_path", sampleLine(c2AtHang(0.3), c2AtHang(m2HangLen), 24), "theoretical");
  if (m2Path) elements.push(m2Path);
  const m2Trail = makeTrail(
    "inclined_pulley_m2_temporal_trail",
    sampleRecentTime(frame.t, Math.max(0.25, frame.duration * 0.35), 18, (tt) => {
      const s = movement ? 0.5 * accelMag * tt * tt : 0;
      const signedTravel = direction > 0 ? s : -s;
      return c2AtHang(Math.max(0.3, Math.min(m2HangLen, m2HangInit + signedTravel)));
    }),
    "temporal"
  );
  if (m2Trail) elements.push(m2Trail);

  // Corde poulie → m2 : segment horizontal court + vertical
  elements.push({
    id: "rope_pulley_to_m2_top",
    type: "rope",
    position: pulleyCenter,
    end: m2Top,
  });
  elements.push({
    id: "rope_hang",
    type: "rope",
    position: m2Top,
    end: c2,
  });

  // Repère monde
  const wa = makeWorldAxis(vp);
  elements.push({ id: "world_axis", type: "world_axis", ...wa });

  // Bloc m1
  const obj1Id = spec.objects[0]?.id ?? "m1";
  const obj2Id = spec.objects[1]?.id ?? "m2";
  const sizePx1 = sizeM1 * vp.scale;
  const sizePx2 = sizeM2 * vp.scale;

  elements.push({
    id: obj1Id,
    type: "block",
    position: c1,
    size: { w: sizePx1, h: sizePx1 },
    rotationDeg: -angleDeg,
    label: spec.objects[0]?.label ?? `m₁=${m1}kg`,
  });
  elements.push({
    id: `local_axis_${obj1Id}`,
    type: "local_axis",
    position: c1,
    meta: { rotationDeg: angleDeg, length: 38, labelX: "x'", labelY: "y'" },
  });

  // Bloc m2
  elements.push({
    id: obj2Id,
    type: "block",
    position: c2,
    size: { w: sizePx2, h: sizePx2 },
    label: spec.objects[1]?.label ?? `m₂=${m2}kg`,
  });
  elements.push({
    id: `local_axis_${obj2Id}`,
    type: "local_axis",
    position: c2,
    meta: { rotationDeg: 0, length: 32 },
  });

  // === Forces ===
  const objectCenters: Record<string, Vec2> = { [obj1Id]: c1, [obj2Id]: c2 };
  const objectLocalRotations: Record<string, number> = { [obj1Id]: angleDeg, [obj2Id]: 0 };
  const forces: ResolvedForce[] = [];

  // Tension commune dans la corde
  // T = m2(g - a)  où a = accelSigned (positif si m1 monte)
  const T = m2 * (g - accelSigned);

  const pushVec = (id: string, label: string, magStr: string | undefined, color: string, type: any, target: string, center: Vec2, vec: Vec2) => {
    const mag = Math.hypot(vec.x, vec.y);
    if (mag < 1e-6) return;
    const ap = forceArrowLength(mag);
    forces.push({
      id, label, magnitude: magStr,
      start: center,
      end: { x: center.x + (vec.x / mag) * ap, y: center.y - (vec.y / mag) * ap },
      color, type, target,
    });
  };

  spec.forces.forEach((f) => {
    if (f.target === obj1Id) {
      switch (f.type) {
        case "weight":
          pushVec(f.id, f.label, f.magnitude ?? `${(m1 * g).toFixed(1)} N`, FORCE_COLORS.weight, "weight", obj1Id, c1, weight(m1, g));
          break;
        case "normal":
          pushVec(f.id, f.label, f.magnitude ?? `${(m1 * g * Math.cos(a)).toFixed(1)} N`, FORCE_COLORS.normal, "normal", obj1Id, c1, normalOnSlope(m1, g, angleDeg));
          break;
        case "tension": {
          // Vers la poulie le long de la pente, sens "up_slope"
          const tx = Math.cos(a) * T;
          const ty = Math.sin(a) * T;
          pushVec(f.id, f.label, f.magnitude ?? `${T.toFixed(1)} N`, FORCE_COLORS.tension, "tension", obj1Id, c1, { x: tx, y: ty });
          break;
        }
        case "friction": {
          // Frottement opposé au mouvement réel
          // Si direction>0 (m1 monte), friction descend la pente : (-cosα, -sinα)
          // Sinon, friction monte la pente
          const sign = direction > 0 ? -1 : 1;
          const fx = sign * Math.cos(a) * friction;
          const fy = sign * Math.sin(a) * friction;
          pushVec(f.id, f.label, f.magnitude ?? `${friction.toFixed(1)} N`, FORCE_COLORS.friction, "friction", obj1Id, c1, { x: fx, y: fy });
          break;
        }
        default: break;
      }
    } else if (f.target === obj2Id) {
      switch (f.type) {
        case "weight":
          pushVec(f.id, f.label, f.magnitude ?? `${(m2 * g).toFixed(1)} N`, FORCE_COLORS.weight, "weight", obj2Id, c2, weight(m2, g));
          break;
        case "tension":
          // Tension verticale vers le HAUT
          pushVec(f.id, f.label, f.magnitude ?? `${T.toFixed(1)} N`, FORCE_COLORS.tension, "tension", obj2Id, c2, { x: 0, y: T });
          break;
        default: break;
      }
    }
  });

  const phaseLabel = movement
    ? `a = ${accelMag.toFixed(2)} m/s²   T = ${T.toFixed(1)} N   v = ${(accelMag * frame.t).toFixed(2)} m/s`
    : `Système à l'équilibre — T = ${(m2 * g).toFixed(1)} N`;

  return { width: W, height: H, elements, forces, objectCenters, objectLocalRotations, phaseLabel };
}
