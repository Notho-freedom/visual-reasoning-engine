import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
}

const PulleyRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const r = (element.size?.w ?? 36) / 2;

  return (
    <g>
      <line x1={x} y1={y - r} x2={x} y2={y - r - 18} stroke="hsl(var(--foreground) / 0.4)" strokeWidth={2} />
      <circle cx={x} cy={y} r={r} fill="hsl(var(--secondary))" stroke="hsl(var(--foreground) / 0.5)" strokeWidth={1.5} />
      <circle cx={x} cy={y} r={3} fill="hsl(var(--foreground) / 0.6)" />
      {element.label && (
        <text x={x} y={y + r + 14} fill="hsl(var(--muted-foreground))" fontSize={10} fontFamily="Inter" textAnchor="middle">
          {element.label}
        </text>
      )}
    </g>
  );
};

export default PulleyRenderer;
