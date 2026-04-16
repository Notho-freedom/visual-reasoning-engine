import React from "react";
import type { DiagramElement } from "@/types/cognitive";

interface Props {
  element: DiagramElement;
  highlighted?: boolean;
}

const ObjectRenderer: React.FC<Props> = ({ element, highlighted }) => {
  const { x, y } = element.position;
  const r = (element.dimensions?.width ?? 24) / 2;

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={highlighted ? "hsl(217 91% 60% / 0.2)" : "hsl(var(--secondary))"}
        stroke={highlighted ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.3)"}
        strokeWidth={highlighted ? 2 : 1.5}
        className="transition-all duration-300"
      />
      <circle
        cx={x}
        cy={y}
        r={3}
        fill={highlighted ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.5)"}
      />
      {element.label && (
        <text
          x={x}
          y={y - r - 8}
          fill="hsl(var(--foreground))"
          fontSize={12}
          fontFamily="Inter"
          fontWeight={500}
          textAnchor="middle"
        >
          {element.label}
        </text>
      )}
    </g>
  );
};

export default ObjectRenderer;
