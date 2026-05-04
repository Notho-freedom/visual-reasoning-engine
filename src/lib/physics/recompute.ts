// Recalcul en temps réel des grandeurs dérivées en fonction des constantes.
// Pour chaque scénario, on retourne un map { clé -> "valeur unité" } qui sera
// fusionné avec step.result si la clé matche (par nom flou).

import type { CognitiveJSON, TimelineStep } from "@/types/cognitive";

type RecomputeMap = Record<string, string>;

const fmt = (v: number, digits = 2) =>
  Number.isFinite(v) ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(digits)) : "—";

function deg(r: number) { return (r * 180) / Math.PI; }
function rad(d: number) { return (d * Math.PI) / 180; }

function recomputeFreeFall(c: Record<string, number>): RecomputeMap {
  const g = c.g ?? 9.81;
  const h = c.h ?? 10;
  const t = Math.sqrt((2 * h) / g);
  const v = g * t;
  return {
    t: `${fmt(t)} s`,
    v: `${fmt(v)} m/s`,
    h: `${fmt(h)} m`,
  };
}

function recomputeInclinedPlane(c: Record<string, number>): RecomputeMap {
  const g = c.g ?? 9.81;
  const a0 = c.alpha ?? c.theta ?? 30;
  const mu = c.mu ?? 0;
  const a = g * (Math.sin(rad(a0)) - mu * Math.cos(rad(a0)));
  return {
    a: `${fmt(a)} m/s²`,
    alpha: `${fmt(a0, 1)}°`,
    mu: `${fmt(mu, 2)}`,
  };
}

function recomputePulley(c: Record<string, number>): RecomputeMap {
  const g = c.g ?? 9.81;
  const m1 = c.m1 ?? 1;
  const m2 = c.m2 ?? 2;
  const a = (Math.abs(m2 - m1) * g) / (m1 + m2);
  const T = (2 * m1 * m2 * g) / (m1 + m2);
  return {
    a: `${fmt(a)} m/s²`,
    T: `${fmt(T)} N`,
  };
}

function recomputeInclinedPulley(c: Record<string, number>): RecomputeMap {
  const g = c.g ?? 9.81;
  const m1 = c.m1 ?? 2;
  const m2 = c.m2 ?? 1;
  const alpha = c.alpha ?? c.theta ?? 30;
  const mu = c.mu ?? 0;
  const num = m2 * g - m1 * g * (Math.sin(rad(alpha)) + mu * Math.cos(rad(alpha)));
  const a = num / (m1 + m2);
  const T = m2 * (g - a);
  return {
    a: `${fmt(a)} m/s²`,
    T: `${fmt(T)} N`,
  };
}

function recomputeProjectile(c: Record<string, number>): RecomputeMap {
  const g = c.g ?? 9.81;
  const v0 = c.v0 ?? 20;
  const a0 = c.alpha ?? c.theta ?? 45;
  const vx = v0 * Math.cos(rad(a0));
  const vy = v0 * Math.sin(rad(a0));
  const tFlight = (2 * vy) / g;
  const range = vx * tFlight;
  const hMax = (vy * vy) / (2 * g);
  return {
    portee: `${fmt(range)} m`,
    range: `${fmt(range)} m`,
    R: `${fmt(range)} m`,
    hauteur: `${fmt(hMax)} m`,
    h_max: `${fmt(hMax)} m`,
    H: `${fmt(hMax)} m`,
    t_vol: `${fmt(tFlight)} s`,
  };
}

function recomputeSpring(c: Record<string, number>): RecomputeMap {
  const k = c.k ?? 200;
  const x = c.x ?? 0.1;
  const m = c.m ?? 1;
  const E = 0.5 * k * x * x;
  const v = Math.sqrt((k * x * x) / m);
  const T = 2 * Math.PI * Math.sqrt(m / k);
  return {
    E: `${fmt(E)} J`,
    Ep: `${fmt(E)} J`,
    v: `${fmt(v)} m/s`,
    T: `${fmt(T, 3)} s`,
  };
}

function recomputePendulum(c: Record<string, number>): RecomputeMap {
  const g = c.g ?? 9.81;
  const L = c.L ?? 1.5;
  const a0 = c.theta ?? c.alpha ?? 25;
  const T = 2 * Math.PI * Math.sqrt(L / g);
  const omega = Math.sqrt(g / L);
  const vmax = Math.sqrt(2 * g * L * (1 - Math.cos(rad(a0))));
  const m = c.m ?? 1;
  const Tmax = m * g * (3 - 2 * Math.cos(rad(a0)));
  return {
    T: `${fmt(T, 3)} s`,
    periode: `${fmt(T, 3)} s`,
    omega: `${fmt(omega, 3)} rad/s`,
    vmax: `${fmt(vmax)} m/s`,
    v_max: `${fmt(vmax)} m/s`,
    Tension: `${fmt(Tmax)} N`,
    T_max: `${fmt(Tmax)} N`,
  };
}

function recomputeHorizontal(c: Record<string, number>): RecomputeMap {
  const m = c.m ?? 1;
  const F = c.F ?? c.applied ?? 10;
  const mu = c.mu ?? 0;
  const g = c.g ?? 9.81;
  const a = (F - mu * m * g) / m;
  return {
    a: `${fmt(a)} m/s²`,
  };
}

const RECOMPUTERS: Record<string, (c: Record<string, number>) => RecomputeMap> = {
  free_fall: recomputeFreeFall,
  inclined_plane: recomputeInclinedPlane,
  pulley: recomputePulley,
  inclined_pulley: recomputeInclinedPulley,
  projectile: recomputeProjectile,
  spring: recomputeSpring,
  pendulum: recomputePendulum,
  horizontal_motion: recomputeHorizontal,
};

export function recomputeStepResult(
  data: CognitiveJSON,
  step: TimelineStep,
  constants: Record<string, number>
): Record<string, string | number> | undefined {
  if (!step.result) return step.result;
  const fn = RECOMPUTERS[data.diagram.scenario];
  if (!fn) return step.result;
  const live = fn(constants);
  const merged: Record<string, string | number> = { ...step.result };
  for (const key of Object.keys(merged)) {
    // matching flou : insensible casse + tirets/underscores
    const norm = key.toLowerCase().replace(/[_\s-]/g, "");
    for (const lk of Object.keys(live)) {
      if (lk.toLowerCase().replace(/[_\s-]/g, "") === norm) {
        merged[key] = live[lk];
        break;
      }
    }
  }
  return merged;
}

export function hasRecomputer(scenario: string): boolean {
  return scenario in RECOMPUTERS;
}
