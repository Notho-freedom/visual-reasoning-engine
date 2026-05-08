import { describe, expect, it } from "vitest";
import { computeLayout } from "../layoutEngine";
import type { CognitiveJSON } from "@/types/cognitive";

const pendulumData: CognitiveJSON = {
  meta: { domain: "physique", scenario: "pendulum", title: "Pendule" },
  constants: { g: 9.81, L: 1.5, theta: 25, m: 1 },
  diagram: {
    scenario: "pendulum",
    params: {},
    objects: [{ id: "mass", type: "ball", mass: 1, size: 0.28 }],
    forces: [
      { id: "weight", target: "mass", type: "weight", label: "P" },
      { id: "tension", target: "mass", type: "tension", label: "T" },
    ],
  },
  timeline: [],
};

function readPoints(element: { meta?: Record<string, number | string | boolean> }) {
  return JSON.parse(String(element.meta?.points ?? "[]")) as Array<{ x: number; y: number }>;
}

describe("pendulum trajectory layout", () => {
  it("adds theoretical and temporal trajectory layers without moving the mass", () => {
    const scene = computeLayout(pendulumData, 0.7);
    const arm = scene.elements.find((el) => el.id === "arm");
    const mass = scene.elements.find((el) => el.id === "mass");
    const theoretical = scene.elements.find((el) => el.id === "pendulum_theoretical_path");
    const temporal = scene.elements.find((el) => el.id === "pendulum_temporal_trail");

    expect(arm?.type).toBe("pendulum_arm");
    expect(mass?.type).toBe("ball");
    expect(theoretical?.type).toBe("trail");
    expect(theoretical?.meta?.variant).toBe("theoretical");
    expect(temporal?.type).toBe("trail");
    expect(temporal?.meta?.variant).toBe("temporal");

    expect(mass?.position).toEqual(scene.objectCenters.mass);
    expect(arm?.end).toEqual(scene.objectCenters.mass);
    expect(scene.objectLocalRotations?.mass).toEqual(expect.any(Number));
  });

  it("keeps trajectory samples on the pendulum radius", () => {
    const scene = computeLayout(pendulumData, 1.2);
    const arm = scene.elements.find((el) => el.id === "arm");
    const theoretical = scene.elements.find((el) => el.id === "pendulum_theoretical_path");
    const temporal = scene.elements.find((el) => el.id === "pendulum_temporal_trail");
    expect(arm?.position).toBeDefined();
    expect(arm?.end).toBeDefined();
    expect(theoretical).toBeDefined();
    expect(temporal).toBeDefined();

    const pivot = arm!.position;
    const radius = Math.hypot(arm!.end!.x - pivot.x, arm!.end!.y - pivot.y);
    const allPoints = [...readPoints(theoretical!), ...readPoints(temporal!)];

    expect(allPoints.length).toBeGreaterThan(20);
    allPoints.forEach((point) => {
      const pointRadius = Math.hypot(point.x - pivot.x, point.y - pivot.y);
      expect(pointRadius).toBeCloseTo(radius, 5);
    });
  });
});
