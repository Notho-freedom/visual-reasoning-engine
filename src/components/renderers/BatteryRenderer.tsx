import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
}

const BatteryRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const h1 = 18;
  const h2 = 10;

  return (
    <g>
      <line x1={x - 20} y1={y} x2={x - 3} y2={y} stroke="hsl(var(--foreground) / 0.4)" strokeWidth={1.5} />
      {/* Long plate (+) */}
      <line x1={x - 3} y1={y - h1} x2={x - 3} y2={y + h1} stroke="hsl(var(--foreground) / 0.5)" strokeWidth={2} />
      {/* Short plate (-) */}
      <line x1={x + 3} y1={y - h2} x2={x + 3} y2={y + h2} stroke="hsl(var(--foreground) / 0.5)" strokeWidth={2} />
      <line x1={x + 3} y1={y} x2={x + 20} y2={y} stroke="hsl(var(--foreground) / 0.4)" strokeWidth={1.5} />
      <text x={x - 6} y={y - h1 - 4} fill="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono">+</text>
      <text x={x + 2} y={y - h2 - 4} fill="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono">−</text>
      {element.label && (
        <text
          x={x}
          y={y + h1 + 14}
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

export default BatteryRenderer;
