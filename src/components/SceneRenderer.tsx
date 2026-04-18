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

interface SceneRendererProps {
  scene: ResolvedScene;
  step?: TimelineStep;
}

const SceneRenderer: React.FC<SceneRendererProps> = ({ scene, step }) => {
  const highlightedElements = new Set(step?.highlight_elements ?? []);
  const highlightedForces = new Set(step?.highlight_forces ?? []);

  return (
    <svg
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      className="w-full h-full block"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background subtle grid */}
      <defs>
        <pattern id="grid" width={40} height={40} patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.4} />
        </pattern>
      </defs>
      <rect width={scene.width} height={scene.height} fill="hsl(var(--card))" />
      <rect width={scene.width} height={scene.height} fill="url(#grid)" />

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
          default: return null;
        }
      })}

      {/* Forces */}
      {scene.forces.map((f) => (
        <VectorRenderer key={f.id} force={f} highlighted={highlightedForces.has(f.id)} />
      ))}

      {/* Step overlay */}
      {step && (
        <g>
          <rect x={12} y={12} width={Math.min(scene.width - 24, Math.max(180, step.title.length * 7 + 30))} height={step.formula ? 46 : 26} rx={6} fill="hsl(var(--background))" opacity={0.7} />
          <text x={22} y={30} fill="hsl(var(--foreground))" fontSize={13} fontWeight={600} fontFamily="Inter">{step.title}</text>
          {step.formula && (
            <text x={22} y={48} fill="hsl(var(--primary))" fontSize={11} fontFamily="JetBrains Mono">{step.formula}</text>
          )}
        </g>
      )}
    </svg>
  );
};

export default SceneRenderer;
