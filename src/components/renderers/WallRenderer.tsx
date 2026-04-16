import React from "react";
import type { DiagramElement } from "@/types/cognitive";

interface Props {
  element: DiagramElement;
}

const WallRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const h = element.dimensions?.height ?? 200;

  return (
    <g>
      <line
        x1={x}
        y1={y}
        x2={x}
        y2={y + h}
        stroke="hsl(var(--foreground) / 0.4)"
        strokeWidth={2}
      />
      {Array.from({ length: Math.floor(h / 12) }).map((_, i) => (
        <line
          key={i}
          x1={x}
          y1={y + i * 12}
          x2={x - 8}
          y2={y + i * 12 + 8}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
          opacity={0.4}
        />
      ))}
    </g>
  );
};

export default WallRenderer;
