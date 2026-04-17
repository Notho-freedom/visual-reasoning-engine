import type { DiagramSpec, ResolvedScene, ResolvedElement, ResolvedForce, Vec2 } from "@/types/cognitive";
import { makeViewport, toSVG, deg2rad, forceArrowLength } from "../coords";
import { weight, normalOnSlope, frictionOnSlope, FORCE_COLORS, customForce } from "../forces";

export function computeInclinedPlane(spec: DiagramSpec, constants: Record<string, number>): ResolvedScene {
  const W = 700;
  const H = 480;
  const angleDeg = spec.params.angle ?? constants.alpha ?? 30;
  const slopeLen = spec.params.length ?? 5; // mètres le long de la pente
  const g = constants.g ?? 9.81;
  const mu = constants.mu ?? spec.params.mu ?? 0;

  // Calcul de l'échelle pour que la pente tienne dans le viewport
  const a = deg2rad(angleDeg);
  const horizExtent = slopeLen * Math.cos(a);
  const vertExtent = slopeLen * Math.sin(a);
  const scalePx = Math.min((W - 180) / Math.max(horizExtent, 1), (H - 160) / Math.max(vertExtent, 1));
  const vp = makeViewport(W, H, scalePx, 90, H - 70);

  const elements: ResolvedElement[] = [];

  // Sol
  const groundLeft = toSVG({ x: -0.5, y: 0 }, vp);
  const groundRight = toSVG({ x: horizExtent + 0.8, y: 0 }, vp);
  elements.push({
    id: "ground",
    type: "ground",
    position: groundLeft,
    end: groundRight,
  });

  // Pente: triangle du coin gauche-bas (0,0) → (length·cosα, 0) → (length·cosα, length·sinα)... 
  // Convention : pente monte vers la GAUCHE. On inverse: base de (0,0) à (horiz,0), sommet à (0, vert).
  // Plus naturel pédagogiquement : pente monte vers la DROITE.
  const slopeBase = toSVG({ x: 0, y: 0 }, vp);
  const slopeFootRight = toSVG({ x: horizExtent, y: 0 }, vp);
  const slopeTop = toSVG({ x: horizExtent, y: vertExtent }, vp);
  elements.push({
    id: "slope",
    type: "slope",
    position: slopeBase,
    end: slopeFootRight,
    size: { w: 0, h: 0 },
    meta: {
      x1: slopeBase.x, y1: slopeBase.y,
      x2: slopeFootRight.x, y2: slopeFootRight.y,
      x3: slopeTop.x, y3: slopeTop.y,
      angleDeg,
    },
  });

  // Arc d'angle au pied
  elements.push({
    id: "angle_arc",
    type: "angle_arc",
    position: slopeBase,
    meta: { angleDeg, radius: 32 },
    label: `α=${angleDeg.toFixed(0)}°`,
  });

  // Axes
  if (spec.showAxis !== false) {
    elements.push({
      id: "axis",
      type: "axis",
      position: toSVG({ x: -0.3, y: 0.3 }, vp),
      size: { w: 70, h: 70 },
    });
  }

  const objectCenters: Record<string, Vec2> = {};
  const forces: ResolvedForce[] = [];

  // Objets ancrés sur la pente
  spec.objects.forEach((obj) => {
    const m = obj.mass ?? constants.m ?? 1;
    const sizeM = obj.size ?? 0.6;
    const sizePx = sizeM * vp.scale;

    // Position le long de la pente (distance depuis le bas)
    const d = obj.distance ?? slopeLen / 2;
    // Centre du bloc : sur la pente, décalé perpendiculairement vers l'extérieur de la pente
    // Direction le long de la pente (montant) : (cos α, sin α)
    // Direction normale extérieure : (-sin α, cos α)
    const halfDiag = sizeM / 2;
    const cxPhys = d * Math.cos(a) + halfDiag * -Math.sin(a);
    const cyPhys = d * Math.sin(a) + halfDiag * Math.cos(a);
    const center = toSVG({ x: cxPhys, y: cyPhys }, vp);

    objectCenters[obj.id] = center;

    elements.push({
      id: obj.id,
      type: obj.type === "ball" ? "ball" : "block",
      position: center,
      size: { w: sizePx, h: sizePx },
      rotationDeg: -angleDeg, // bloc aligné sur la pente (SVG est Y-down donc -)
      label: obj.label,
      meta: { mass: m },
    });

    // Forces sur cet objet
    spec.forces
      .filter((f) => f.target === obj.id)
      .forEach((f) => {
        let vec: Vec2 = { x: 0, y: 0 };
        switch (f.type) {
          case "weight":
            vec = weight(m, g);
            break;
          case "normal":
            vec = normalOnSlope(m, g, angleDeg);
            break;
          case "friction": {
            const dir = (f.orientation as "up_slope" | "down_slope") ?? "up_slope";
            vec = frictionOnSlope(m, g, angleDeg, mu || 0.2, dir);
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
        const ux = vec.x / mag;
        const uy = vec.y / mag;

        // Le centre est en SVG, mais le vecteur vec est en repère physique (Y-up).
        // En SVG, Y est inversé donc on inverse uy.
        const end: Vec2 = {
          x: center.x + ux * arrowPx,
          y: center.y - uy * arrowPx,
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
