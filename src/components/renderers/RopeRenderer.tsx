import React from "react";
import type { DiagramElement } from "@/types/cognitive";

interface Props {
  element: DiagramElement;
}

const RopeRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const h = element.dimensions?.height ?? 100;
  const endX = x + (element.dimensions?.width ?? 0);
  const endY = y + h;

  return (
    <g>
      <line
        x1={x}
        y1={y}
        x2={endX}
        y2={endY}
        stroke="hsl(var(--foreground) / 0.4)"
        strokeWidth={1.5}
        strokeDasharray={element.style?.dashed ? "4 3" : undefined}
      />
      {element.label && (
        <text
          x={(x + endX) / 2 + 8}
          y={(y + endY) / 2}
          fill="hsl(var(--muted-foreground))"
          fontSize={10}
          fontFamily="JetBrains Mono"
        >
          {element.label}
        </text>
      )}
    </g>
  );
};

export default RopeRenderer;
