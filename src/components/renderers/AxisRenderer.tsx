import React from "react";
import type { DiagramElement } from "@/types/cognitive";

interface Props {
  element: DiagramElement;
}

const AxisRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const w = element.dimensions?.width ?? 80;
  const h = element.dimensions?.height ?? 80;

  return (
    <g opacity={0.4}>
      {/* X axis */}
      <line x1={x} y1={y} x2={x + w} y2={y} stroke="hsl(var(--foreground))" strokeWidth={1} />
      <polygon points={`${x + w},${y} ${x + w - 6},${y - 3} ${x + w - 6},${y + 3}`} fill="hsl(var(--foreground))" />
      <text x={x + w + 6} y={y + 4} fill="hsl(var(--foreground))" fontSize={11} fontFamily="JetBrains Mono">x</text>
      {/* Y axis */}
      <line x1={x} y1={y} x2={x} y2={y - h} stroke="hsl(var(--foreground))" strokeWidth={1} />
      <polygon points={`${x},${y - h} ${x - 3},${y - h + 6} ${x + 3},${y - h + 6}`} fill="hsl(var(--foreground))" />
      <text x={x - 14} y={y - h} fill="hsl(var(--foreground))" fontSize={11} fontFamily="JetBrains Mono">y</text>
      {/* Origin */}
      <text x={x - 12} y={y + 14} fill="hsl(var(--foreground))" fontSize={10} fontFamily="JetBrains Mono">O</text>
    </g>
  );
};

export default AxisRenderer;
