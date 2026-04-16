import React from "react";
import type { CognitiveJSON, DiagramElement, Force, TimelineStep } from "@/types/cognitive";
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
import WireRenderer from "./renderers/WireRenderer";
import ResistorRenderer from "./renderers/ResistorRenderer";
import CapacitorRenderer from "./renderers/CapacitorRenderer";
import BatteryRenderer from "./renderers/BatteryRenderer";
import ProjectilePathRenderer from "./renderers/ProjectilePathRenderer";

const elementRenderers: Record<string, React.FC<{ element: DiagramElement; highlighted?: boolean }>> = {
  ground: GroundRenderer,
  object: ObjectRenderer,
  slope: SlopeRenderer,
  spring: SpringRenderer,
  rope: RopeRenderer,
  pulley: PulleyRenderer,
  wall: WallRenderer,
  axis: AxisRenderer,
  projectile_path: ProjectilePathRenderer,
  wire: WireRenderer,
  resistor: ResistorRenderer,
  capacitor: CapacitorRenderer,
  battery: BatteryRenderer,
};

// DimensionRenderer doesn't follow the same prop pattern exactly but works
const dimensionTypes = new Set(["dimension"]);

interface SceneRendererProps {
  data: CognitiveJSON;
  currentStep: number;
}

const SceneRenderer: React.FC<SceneRendererProps> = ({ data, currentStep }) => {
  const { diagram, timeline } = data;
  const step: TimelineStep | undefined = timeline[currentStep];
  const highlightedElements = new Set(step?.highlight_elements ?? []);
  const highlightedForces = new Set(step?.highlight_forces ?? []);

  const w = diagram.width || 600;
  const h = diagram.height || 450;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-full"
      style={{ maxHeight: "500px" }}
    >
      <rect width={w} height={h} fill="hsl(222, 47%, 7%)" />

      {/* Render diagram elements */}
      {diagram.elements.map((el) => {
        if (dimensionTypes.has(el.type)) {
          return <DimensionRenderer key={el.id} element={el} />;
        }
        const Renderer = elementRenderers[el.type];
        if (!Renderer) return null;
        return (
          <Renderer
            key={el.id}
            element={el}
            highlighted={highlightedElements.has(el.id)}
          />
        );
      })}

      {/* Render forces */}
      {diagram.forces.map((force) => (
        <VectorRenderer
          key={force.id}
          force={force}
          highlighted={highlightedForces.has(force.id)}
        />
      ))}

      {/* Step info overlay */}
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
              fill="hsl(var(--primary))"
              fontSize={12}
              fontFamily="JetBrains Mono"
              opacity={0.8}
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
