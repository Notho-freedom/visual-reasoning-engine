import React from "react";
import type { ResolvedScene, TimelineStep } from "@/types/cognitive";
import GroundRenderer from "./renderers/GroundRenderer";
import ObjectRenderer from "./renderers/ObjectRenderer";
import VectorRenderer from "./renderers/VectorRenderer";
import SlopeRenderer from "./renderers/SlopeRenderer";
import SpringRenderer from "./renderers/SpringRenderer";
import RopeRenderer from "./renderers/RopeRenderer";
import PulleyRenderer from "./renderers/PulleyRenderer";
import WallRenderer from "./renderers/WallRenderer";
import AxisRenderer from "./renderers/AxisRenderer";
import WorldAxisRenderer from "./renderers/WorldAxisRenderer";
import LocalAxisRenderer from "./renderers/LocalAxisRenderer";
import DimensionRenderer from "./renderers/DimensionRenderer";
import ProjectilePathRenderer from "./renderers/ProjectilePathRenderer";
import AngleArcRenderer from "./renderers/AngleArcRenderer";
import PendulumArmRenderer from "./renderers/PendulumArmRenderer";
import WireRenderer from "./renderers/WireRenderer";
import ResistorRenderer from "./renderers/ResistorRenderer";
import CapacitorRenderer from "./renderers/CapacitorRenderer";
import BatteryRenderer from "./renderers/BatteryRenderer";
import CurrentFlowRenderer from "./renderers/CurrentFlowRenderer";
import ForceProjectionRenderer from "./renderers/ForceProjectionRenderer";

interface SceneRendererProps {
  scene: ResolvedScene;
  step?: TimelineStep;
}

const SceneRenderer: React.FC<SceneRendererProps> = ({ scene, step }) => {
  const highlightedElements = new Set(step?.highlight_elements ?? []);
  const highlightedForces = new Set(step?.highlight_forces ?? []);

  const isProjection = step?.type === "projection";
  const projectionTargetId = step?.projection_target ?? (step?.highlight_forces?.[0]
    ? scene.forces.find(f => f.id === step.highlight_forces![0])?.target
    : undefined);

  const projectionForces = isProjection
    ? scene.forces.filter(f =>
        (highlightedForces.size === 0 || highlightedForces.has(f.id)) &&
        (projectionTargetId == null || f.target === projectionTargetId)
      )
    : [];

  const projectionRotation = projectionTargetId
    ? scene.objectLocalRotations?.[projectionTargetId] ?? 0
    : 0;
  const projectionOrigin = projectionTargetId ? scene.objectCenters[projectionTargetId] : undefined;

  return (
    <svg
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      className="w-full h-full block"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id="grid" width={40} height={40} patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth={0.6} opacity={0.7} />
        </pattern>
        <pattern id="grid-fine" width={8} height={8} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={0.6} fill="hsl(var(--border))" opacity={0.6} />
        </pattern>
      </defs>
      <rect width={scene.width} height={scene.height} fill="hsl(var(--card))" />
      <rect width={scene.width} height={scene.height} fill="url(#grid-fine)" />

      {/* Trails (background layer) */}
      {scene.elements.filter((el) => el.type === "trail").map((el) => {
        const points = JSON.parse(String(el.meta?.points ?? "[]")) as { x: number; y: number }[];
        if (points.length < 2) return null;
        const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        return <path key={el.id} d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="3 3" />;
      })}

      {scene.elements.filter((el) => el.type !== "trail").map((el) => {
        const highlighted = highlightedElements.has(el.id);
        switch (el.type) {
          case "ground": return <GroundRenderer key={el.id} element={el} />;
          case "slope": return <SlopeRenderer key={el.id} element={el} />;
          case "wall": return <WallRenderer key={el.id} element={el} />;
          case "block":
          case "ball": return <ObjectRenderer key={el.id} element={el} highlighted={highlighted} />;
          case "spring": return <SpringRenderer key={el.id} element={el} />;
          case "rope": return <RopeRenderer key={el.id} element={el} />;
          case "pulley": return <PulleyRenderer key={el.id} element={el} />;
          case "axis": return <AxisRenderer key={el.id} element={el} />;
          case "world_axis": return <WorldAxisRenderer key={el.id} element={el} />;
          case "local_axis": return <LocalAxisRenderer key={el.id} element={el} />;
          case "projectile_path": return <ProjectilePathRenderer key={el.id} element={el} />;
          case "pendulum_arm": return <PendulumArmRenderer key={el.id} element={el} />;
          case "angle_arc": return <AngleArcRenderer key={el.id} element={el} />;
          case "dimension": return <DimensionRenderer key={el.id} element={el} />;
          case "wire": return <WireRenderer key={el.id} element={el} />;
          case "resistor": return <ResistorRenderer key={el.id} element={el} />;
          case "capacitor": return <CapacitorRenderer key={el.id} element={el} />;
          case "battery": return <BatteryRenderer key={el.id} element={el} />;
          case "current_flow": return <CurrentFlowRenderer key={el.id} element={el} />;
          default: return null;
        }
      })}

      {/* Forces */}
      {scene.forces.map((f) => (
        <VectorRenderer key={f.id} force={f} highlighted={highlightedForces.has(f.id)} />
      ))}

      {/* Projections sur axes locaux */}
      {isProjection && projectionOrigin && projectionForces.map((f) => (
        <ForceProjectionRenderer
          key={`proj-${f.id}`}
          force={f}
          origin={projectionOrigin}
          localRotationDeg={projectionRotation}
        />
      ))}

      {/* Step overlay déplacé vers BlackboardOverlay (HTML/typewriter) */}
    </svg>
  );
};

export default SceneRenderer;
