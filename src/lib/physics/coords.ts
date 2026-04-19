import type { Vec2 } from "@/types/cognitive";

export interface Viewport {
  width: number;
  height: number;
  scale: number;
  originX: number;
  originY: number;
}

export function makeViewport(
  width: number,
  height: number,
  scale: number,
  originX = 80,
  originY = height - 80
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

export function rad2deg(r: number): number {
  return (r * 180) / Math.PI;
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

export const FORCE_SCALE_PX_PER_N = 2.4;

export function forceArrowLength(valueN: number): number {
  const raw = Math.abs(valueN) * FORCE_SCALE_PX_PER_N;
  return Math.max(44, Math.min(120, raw));
}

/**
 * Repère MONDE — toujours fixé en bas-gauche du CANVAS SVG, indépendamment du viewport physique.
 * Le scalePxPerM affiché reste celui du viewport pour l'échelle "1 m".
 */
export function makeWorldAxis(vp: Viewport): {
  position: Vec2;
  size: { w: number; h: number };
  meta: Record<string, number>;
} {
  return {
    position: { x: 50, y: vp.height - 40 },
    size: { w: 70, h: 70 },
    meta: { scalePxPerM: vp.scale },
  };
}
