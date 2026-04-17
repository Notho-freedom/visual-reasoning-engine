import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
}

const DimensionRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const endX = element.end?.x ?? x;
  const endY = element.end?.y ?? y;

  return (
    <g opacity={0.5}>
      <line
        x1={x}
        y1={y}
        x2={endX}
        y2={endY}
        stroke="hsl(var(--primary))"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {/* End markers */}
      <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke="hsl(var(--primary))" strokeWidth={1} />
      <line x1={endX} y1={endY - 4} x2={endX} y2={endY + 4} stroke="hsl(var(--primary))" strokeWidth={1} />
      {element.label && (
        <text
          x={(x + endX) / 2}
          y={(y + endY) / 2 - 8}
          fill="hsl(var(--primary))"
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

export default DimensionRenderer;
