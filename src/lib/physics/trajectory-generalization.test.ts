import { describe, expect, it } from "vitest";
import { computeLayout } from "./layoutEngine";
import type { CognitiveJSON, ResolvedElement } from "@/types/cognitive";

function data(scenario: CognitiveJSON["diagram"]["scenario"], params: Record<string, number>, constants: Record<string, number>, objects: CognitiveJSON["diagram"]["objects"], forces: CognitiveJSON["diagram"]["forces"] = []): CognitiveJSON {
  return {
    meta: { domain: "physique", scenario, title: scenario },
    constants,
    diagram: { scenario, params, objects, forces },
    timeline: [],
  };
}

function trails(scene: ReturnType<typeof computeLayout>, variant: "theoretical" | "temporal") {
  return scene.elements.filter((el) => el.type === "trail" && el.meta?.variant === variant);
}

function points(el: ResolvedElement) {
  return JSON.parse(String(el.meta?.points ?? "[]")) as Array<{ x: number; y: number }>;
}

function expectVertical(el: ResolvedElement) {
  const pts = points(el);
  const x = pts[0].x;
  expect(pts.length).toBeGreaterThan(2);
  pts.forEach((p) => expect(p.x).toBeCloseTo(x, 5));
}

function expectHorizontal(el: ResolvedElement) {
  const pts = points(el);
  const y = pts[0].y;
  expect(pts.length).toBeGreaterThan(2);
  pts.forEach((p) => expect(p.y).toBeCloseTo(y, 5));
}

describe("trajectory layers across scenarios", () => {
  it("adds vertical theoretical and temporal paths to free fall", () => {
    const scene = computeLayout(data("free_fall", {}, { h: 10, g: 9.81, m: 1 }, [{ id: "object", type: "ball", mass: 1 }]), 0.8);
    expect(trails(scene, "theoretical")).toHaveLength(1);
    expect(trails(scene, "temporal")).toHaveLength(1);
    expectVertical(trails(scene, "theoretical")[0]);
    expectVertical(trails(scene, "temporal")[0]);
    expect(scene.objectCenters.object).toEqual(scene.elements.find((el) => el.id === "object")?.position);
  });

  it("marks projectile parabola history with theoretical and temporal trails", () => {
    const scene = computeLayout(data("projectile", { v0: 20, theta: 45 }, { g: 9.81 }, [{ id: "p", type: "ball", mass: 1 }], [{ id: "P", target: "p", type: "weight", label: "P" }]), 0.8);
    expect(trails(scene, "theoretical")).toHaveLength(1);
    expect(trails(scene, "temporal")).toHaveLength(1);
    expect(scene.elements.find((el) => el.id === "traj")?.meta?.variant).toBe("theoretical");
    expect(scene.objectCenters.p).toEqual(scene.elements.find((el) => el.id === "p")?.position);
  });

  it("adds slope-aligned paths to inclined plane", () => {
    const scene = computeLayout(data("inclined_plane", { angle: 30, length: 5 }, { g: 9.81, m: 2, mu: 0.1 }, [{ id: "block", type: "block", mass: 2 }]), 0.8);
    expect(trails(scene, "theoretical")).toHaveLength(1);
    expect(trails(scene, "temporal")).toHaveLength(1);
    expect(scene.objectLocalRotations?.block).toBe(30);
    expect(scene.objectCenters.block).toEqual(scene.elements.find((el) => el.id === "block")?.position);
  });

  it("adds horizontal motion rail and recent trace", () => {
    const scene = computeLayout(data("horizontal_motion", {}, { a: 2, v0: 0, m: 1 }, [{ id: "block", type: "block", mass: 1 }]), 0.8);
    expect(trails(scene, "theoretical")).toHaveLength(1);
    expect(trails(scene, "temporal")).toHaveLength(1);
    expectHorizontal(trails(scene, "theoretical")[0]);
    expectHorizontal(trails(scene, "temporal")[0]);
  });

  it("adds oscillation corridors to horizontal and vertical springs", () => {
    const horizontal = computeLayout(data("spring", { x: 0.3, L: 1.8 }, { k: 50, m: 1 }, [{ id: "block", type: "block", mass: 1 }]), 1.5);
    const vertical = computeLayout(data("spring", { x: 0.15, L: 0.8, vertical: 1 }, { k: 50, m: 1, g: 9.81 }, [{ id: "block", type: "block", mass: 1 }]), 0.8);
    expect(trails(horizontal, "theoretical")).toHaveLength(1);
    expect(trails(horizontal, "temporal")).toHaveLength(1);
    expectHorizontal(trails(horizontal, "theoretical")[0]);
    expect(trails(vertical, "theoretical")).toHaveLength(1);
    expect(trails(vertical, "temporal")).toHaveLength(1);
    expectVertical(trails(vertical, "theoretical")[0]);
  });

  it("adds constrained paths to pulley systems", () => {
    const pulley = computeLayout(data("pulley", { length: 3 }, { g: 9.81, m1: 2, m2: 3 }, [
      { id: "m1", type: "block", mass: 2 },
      { id: "m2", type: "block", mass: 3 },
    ]), 0.8);
    const inclinedPulley = computeLayout(data("inclined_pulley", { angle: 30, length: 4.5 }, { g: 9.81, m1: 2, m2: 3, mu: 0.1 }, [
      { id: "m1", type: "block", mass: 2 },
      { id: "m2", type: "block", mass: 3 },
    ]), 0.8);

    expect(trails(pulley, "theoretical")).toHaveLength(2);
    expect(trails(pulley, "temporal")).toHaveLength(2);
    trails(pulley, "theoretical").forEach(expectVertical);
    expect(pulley.objectLocalRotations?.m1).toBe(0);
    expect(pulley.objectLocalRotations?.m2).toBe(0);

    expect(trails(inclinedPulley, "theoretical")).toHaveLength(2);
    expect(trails(inclinedPulley, "temporal")).toHaveLength(2);
    expectVertical(trails(inclinedPulley, "theoretical").find((el) => el.id.includes("m2"))!);
    expect(inclinedPulley.objectLocalRotations?.m1).toBe(30);
    expect(inclinedPulley.objectLocalRotations?.m2).toBe(0);
  });
});
