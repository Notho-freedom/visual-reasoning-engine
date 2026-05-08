import type { ResolvedElement, Vec2 } from "@/types/cognitive";

export type TrailVariant = "theoretical" | "temporal";

export function makeTrail(id: string, points: Vec2[], variant: TrailVariant): ResolvedElement | null {
  if (points.length < 2) return null;
  return {
    id,
    type: "trail",
    position: points[0],
    end: points[points.length - 1],
    meta: {
      variant,
      points: JSON.stringify(points),
    },
  };
}

export function sampleLine(start: Vec2, end: Vec2, steps = 24): Vec2[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const r = i / steps;
    return {
      x: start.x + (end.x - start.x) * r,
      y: start.y + (end.y - start.y) * r,
    };
  });
}

export function sampleParametric(steps: number, fn: (ratio: number) => Vec2): Vec2[] {
  return Array.from({ length: steps + 1 }, (_, i) => fn(i / steps));
}

export function sampleRecentTime(currentT: number, windowSeconds: number, steps: number, fn: (t: number) => Vec2): Vec2[] {
  const startT = Math.max(0, currentT - windowSeconds);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const r = i / steps;
    return fn(startT + (currentT - startT) * r);
  });
}
