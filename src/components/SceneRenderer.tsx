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
      className="w-full h-full"
      style={{ maxHeight: "560px" }}
    >
      <rect width={scene.width} height={scene.height} fill="hsl(222, 47%, 6%)" />

      {/* Eléments */}
      {scene.elements.map((el) => {
        const highlighted = highlightedElements.has(el.id);
        switch (el.type) {
          case "ground":
            return <GroundRenderer key={el.id} element={el} />;
          case "slope":
            return <SlopeRenderer key={el.id} element={el} />;
          case "wall":
            return <WallRenderer key={el.id} element={el} />;
          case "block":
          case "ball":
            return <ObjectRenderer key={el.id} element={el} highlighted={highlighted} />;
          case "spring":
            return <SpringRenderer key={el.id} element={el} />;
          case "rope":
            return <RopeRenderer key={el.id} element={el} />;
          case "pulley":
            return <PulleyRenderer key={el.id} element={el} />;
          case "axis":
            return <AxisRenderer key={el.id} element={el} />;
          case "projectile_path":
            return <ProjectilePathRenderer key={el.id} element={el} />;
          case "pendulum_arm":
            return <PendulumArmRenderer key={el.id} element={el} />;
          case "angle_arc":
            return <AngleArcRenderer key={el.id} element={el} />;
          case "dimension":
            return <DimensionRenderer key={el.id} element={el} />;
          default:
            return null;
        }
      })}

      {/* Forces */}
      {scene.forces.map((f) => (
        <VectorRenderer key={f.id} force={f} highlighted={highlightedForces.has(f.id)} />
      ))}

      {/* Step overlay */}
      {step && (
        <g>
          <text
            x={16}
            y={24}
            fill="hsl(210, 20%, 92%)"
            fontSize={13}
            fontWeight={600}
            fontFamily="Inter"
          >
            {step.title}
          </text>
          {step.formula && (
            <text
              x={16}
              y={42}
              fill="hsl(217, 91%, 65%)"
              fontSize={12}
              fontFamily="JetBrains Mono"
              opacity={0.85}
            >
              {step.formula}
            </text>
          )}
        </g>
      )}
    </svg>
  );
};

export default SceneRenderer;
