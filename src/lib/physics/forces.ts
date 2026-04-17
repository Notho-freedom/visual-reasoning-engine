import type { Vec2 } from "@/types/cognitive";
import { deg2rad, unit } from "./coords";

/**
 * Toutes les fonctions retournent un vecteur en repère PHYSIQUE (Y-up, newtons).
 * Le rendu SVG inversera Y plus tard.
 */

export function weight(mass: number, g: number): Vec2 {
  return { x: 0, y: -mass * g };
}

/**
 * Réaction normale sur un plan incliné d'angle α (en degrés, monte vers la droite).
 * Le bloc est posé sur la pente; la normale est perpendiculaire à la pente, vers le haut.
 */
export function normalOnSlope(mass: number, g: number, alphaDeg: number): Vec2 {
  const a = deg2rad(alphaDeg);
  const N = mass * g * Math.cos(a);
  // perpendiculaire à la pente, vers le haut-gauche : (-sin α, cos α)
  return { x: -Math.sin(a) * N, y: Math.cos(a) * N };
}

export function normalHorizontal(mass: number, g: number): Vec2 {
  return { x: 0, y: mass * g };
}

/**
 * Frottement le long d'une pente d'angle α.
 * direction "up_slope" => le long de la pente vers le haut: (cos α, sin α)
 * direction "down_slope" => (-cos α, -sin α)
 */
export function frictionOnSlope(
  mass: number,
  g: number,
  alphaDeg: number,
  mu: number,
  direction: "up_slope" | "down_slope" = "up_slope"
): Vec2 {
  const a = deg2rad(alphaDeg);
  const f = mu * mass * g * Math.cos(a);
  const sign = direction === "up_slope" ? 1 : -1;
  return { x: sign * Math.cos(a) * f, y: sign * Math.sin(a) * f };
}

/** Tension le long d'une corde, du point d'ancrage vers la masse (vecteur tirant la masse vers l'ancrage). */
export function tensionAlong(magnitude: number, fromMass: Vec2, toAnchor: Vec2): Vec2 {
  const dir = unit({ x: toAnchor.x - fromMass.x, y: toAnchor.y - fromMass.y });
  return { x: dir.x * magnitude, y: dir.y * magnitude };
}

/** Force ressort: F = -k*x le long de l'axe (signé). */
export function springForce(k: number, x: number, axis: Vec2): Vec2 {
  const u = unit(axis);
  const mag = -k * x;
  return { x: u.x * mag, y: u.y * mag };
}

/** Vecteur custom à partir d'une direction unitaire et d'une magnitude (en N). */
export function customForce(directionUnit: Vec2, magnitude: number): Vec2 {
  const u = unit(directionUnit);
  return { x: u.x * magnitude, y: u.y * magnitude };
}

/** Couleurs standardisées par type. */
export const FORCE_COLORS: Record<string, string> = {
  weight: "hsl(0, 72%, 55%)",
  normal: "hsl(142, 71%, 50%)",
  friction: "hsl(38, 92%, 55%)",
  tension: "hsl(217, 91%, 62%)",
  applied: "hsl(217, 91%, 62%)",
  spring: "hsl(280, 70%, 60%)",
  drag: "hsl(195, 80%, 55%)",
  reaction: "hsl(262, 83%, 60%)",
  custom: "hsl(210, 20%, 80%)",
};
