import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
}

const PendulumArmRenderer: React.FC<Props> = ({ element }) => {
  const x1 = element.position.x;
  const y1 = element.position.y;
  const x2 = element.end?.x ?? x1;
  const y2 = element.end?.y ?? y1;
  return (
    <g>
      {/* Pivot */}
      <circle cx={x1} cy={y1} r={4} fill="hsl(var(--foreground))" />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="hsl(var(--foreground) / 0.7)"
        strokeWidth={1.8}
      />
      {element.label && (
        <text
          x={(x1 + x2) / 2 + 10}
          y={(y1 + y2) / 2}
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

export default PendulumArmRenderer;
