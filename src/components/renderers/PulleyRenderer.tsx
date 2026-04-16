import React from "react";
import type { DiagramElement } from "@/types/cognitive";

interface Props {
  element: DiagramElement;
}

const PulleyRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const r = (element.dimensions?.width ?? 30) / 2;

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="hsl(var(--secondary))"
        stroke="hsl(var(--foreground) / 0.3)"
        strokeWidth={1.5}
      />
      <circle cx={x} cy={y} r={3} fill="hsl(var(--foreground) / 0.5)" />
      {/* Mount */}
      <line
        x1={x}
        y1={y - r}
        x2={x}
        y2={y - r - 15}
        stroke="hsl(var(--foreground) / 0.3)"
        strokeWidth={2}
      />
      <line
        x1={x - 12}
        y1={y - r - 15}
        x2={x + 12}
        y2={y - r - 15}
        stroke="hsl(var(--foreground) / 0.3)"
        strokeWidth={2}
      />
      {element.label && (
        <text
          x={x}
          y={y + r + 16}
          fill="hsl(var(--muted-foreground))"
          fontSize={10}
          fontFamily="Inter"
          textAnchor="middle"
        >
          {element.label}
        </text>
      )}
    </g>
  );
};

export default PulleyRenderer;
