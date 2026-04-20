import type { ScenarioType, AnimationFrame } from "@/types/cognitive";

/** Durée naturelle d'animation par scénario (en secondes simulées). */
export function defaultDuration(scenario: ScenarioType, params: Record<string, number>, constants: Record<string, number>): number {
  const g = constants.g ?? 9.81;
  switch (scenario) {
    case "free_fall": {
      const h = params.height ?? constants.h ?? 10;
      return Math.sqrt((2 * h) / g);
    }
    case "projectile": {
      const v0 = params.v0 ?? constants.v0 ?? 20;
      const theta = ((params.theta ?? constants.theta ?? 45) * Math.PI) / 180;
      return (2 * v0 * Math.sin(theta)) / g;
    }
    case "inclined_plane": {
      const L = params.length ?? 5;
      const dStart = Math.max(0.5, L - 0.5);
      const alpha = ((params.angle ?? constants.alpha ?? 30) * Math.PI) / 180;
      const mu = constants.mu ?? params.mu ?? 0;
      const a = Math.max(0.1, g * (Math.sin(alpha) - mu * Math.cos(alpha)));
      return Math.sqrt((2 * dStart) / a);
    }
    case "inclined_pulley": {
      const L = params.length ?? 4.5;
      const dStart = Math.max(1, L - 0.6);
      const alpha = ((params.angle ?? constants.alpha ?? 30) * Math.PI) / 180;
      const mu = constants.mu ?? params.mu ?? 0;
      const m1 = constants.m1 ?? constants.m ?? 2;
      const m2 = constants.m2 ?? 1;
      const driving = Math.abs(m2 * g - m1 * g * Math.sin(alpha));
      const friction = mu * m1 * g * Math.cos(alpha);
      const a = Math.max(0.3, (driving - friction) / (m1 + m2));
      const dMax = Math.min(dStart, 1.5);
      return Math.max(1.5, Math.sqrt((2 * dMax) / a));
    }
    case "spring": {
      const k = constants.k ?? params.k ?? 50;
      const m = constants.m ?? 1;
      const omega = Math.sqrt(k / m);
      return 1.2 + (2 * Math.PI) / omega;
    }
    case "pendulum": {
      const L = params.length ?? constants.L ?? 1.5;
      const omega = Math.sqrt(g / L);
      return 2 * ((2 * Math.PI) / omega);
    }
    case "pulley": {
      const m1 = constants.m1 ?? 2;
      const m2 = constants.m2 ?? 3;
      const ropeLen = params.length ?? 3;
      const a = Math.abs((m2 - m1) * g) / (m1 + m2);
      // Distance max parcourue avant clamp (cohérent avec computePulley: maxDisp = ropeLen * 0.6)
      const dMax = ropeLen * 0.6;
      return Math.max(1.2, Math.sqrt((2 * dMax) / Math.max(a, 0.3)));
    }
    case "horizontal_motion": {
      const a = constants.a ?? params.a ?? 2;
      const v0 = constants.v0 ?? params.v0 ?? 0;
      // Distance max avant clamp (cohérent avec computeHorizontalMotion: xClamped à 8.5)
      const dist = 7;
      // Résoud d = v0·t + ½·a·t²
      const aa = Math.max(0.1, Math.abs(a));
      const t = (-v0 + Math.sqrt(v0 * v0 + 2 * aa * dist)) / aa;
      return Math.max(1.5, t);
    }
    case "circuit":
      return 4;
    default:
      return 3;
  }
}

export function makeFrame(t: number, duration: number): AnimationFrame {
  return { t, duration, progress: duration > 0 ? Math.min(1, t / duration) : 0 };
}
