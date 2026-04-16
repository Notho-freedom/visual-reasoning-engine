import React from "react";
import type { DiagramElement } from "@/types/cognitive";

interface Props {
  element: DiagramElement;
}

const CapacitorRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const gap = 8;
  const h = 20;

  return (
    <g>
      <line x1={x - 20} y1={y} x2={x - gap / 2} y2={y} stroke="hsl(var(--foreground) / 0.4)" strokeWidth={1.5} />
      <line x1={x - gap / 2} y1={y - h} x2={x - gap / 2} y2={y + h} stroke="hsl(var(--foreground) / 0.5)" strokeWidth={2} />
      <line x1={x + gap / 2} y1={y - h} x2={x + gap / 2} y2={y + h} stroke="hsl(var(--foreground) / 0.5)" strokeWidth={2} />
      <line x1={x + gap / 2} y1={y} x2={x + 20} y2={y} stroke="hsl(var(--foreground) / 0.4)" strokeWidth={1.5} />
      {element.label && (
        <text
          x={x}
          y={y - h - 6}
          fill="hsl(var(--muted-foreground))"
          fontSize={10}
          fontFamily="JetBrains Mono"
          textAnchor="middle"
        >
          {element.label}
        </text>
      )}
    </g>
  );
};

export default CapacitorRenderer;
