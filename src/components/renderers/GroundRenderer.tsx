import React from "react";
import type { DiagramElement } from "@/types/cognitive";

interface Props {
  element: DiagramElement;
}

const GroundRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const w = element.dimensions?.width ?? 500;

  return (
    <g>
      <line
        x1={x}
        y1={y}
        x2={x + w}
        y2={y}
        stroke="hsl(var(--foreground))"
        strokeWidth={2}
        strokeOpacity={0.5}
      />
      {/* Hatch marks */}
      {Array.from({ length: Math.floor(w / 16) }).map((_, i) => (
        <line
          key={i}
          x1={x + i * 16}
          y1={y}
          x2={x + i * 16 + 10}
          y2={y + 8}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
          strokeOpacity={0.4}
        />
      ))}
      {element.label && (
        <text
          x={x + w + 8}
          y={y + 4}
          fill="hsl(var(--muted-foreground))"
          fontSize={11}
          fontFamily="Inter"
        >
          {element.label}
        </text>
      )}
    </g>
  );
};

export default GroundRenderer;
