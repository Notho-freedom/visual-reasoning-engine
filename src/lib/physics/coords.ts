import type { Vec2 } from "@/types/cognitive";

/**
 * Conversion repère physique (origine bas-gauche, Y-up, mètres)
 * → repère SVG (origine haut-gauche, Y-down, pixels)
 */
export interface Viewport {
  width: number;
  height: number;
  /** pixels par mètre */
  scale: number;
  /** offset SVG du point physique (0,0) */
  originX: number;
  originY: number;
}

export function makeViewport(
  width: number,
  height: number,
  scale: number,
  originX = 60,
  originY = height - 60
): Viewport {
  return { width, height, scale, originX, originY };
}

export function toSVG(p: Vec2, vp: Viewport): Vec2 {
  return {
    x: vp.originX + p.x * vp.scale,
    y: vp.originY - p.y * vp.scale,
  };
}

export function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function norm(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function unit(v: Vec2): Vec2 {
  const n = norm(v);
  return n > 1e-9 ? { x: v.x / n, y: v.y / n } : { x: 0, y: 0 };
}

/** Échelle des vecteurs forces : px par newton */
export const FORCE_SCALE_PX_PER_N = 2.2;

/** Longueur visuelle d'une force, bornée pour éviter écrans débordés */
export function forceArrowLength(valueN: number): number {
  const raw = Math.abs(valueN) * FORCE_SCALE_PX_PER_N;
  return Math.max(40, Math.min(110, raw));
}
