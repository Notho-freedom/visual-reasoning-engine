import React from "react";
import type { DiagramElement } from "@/types/cognitive";

interface Props {
  element: DiagramElement;
}

const SlopeRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const w = element.dimensions?.width ?? 300;
  const h = element.dimensions?.height ?? 150;
  const angle = element.rotation ?? 30;

  return (
    <g>
      {/* Slope surface */}
      <polygon
        points={`${x},${y} ${x + w},${y} ${x + w},${y - h}`}
        fill="hsl(var(--secondary) / 0.3)"
        stroke="hsl(var(--foreground) / 0.3)"
        strokeWidth={1.5}
      />
      {/* Angle arc */}
      <path
        d={`M ${x + 40},${y} A 40 40 0 0 0 ${x + 40 * Math.cos(angle * Math.PI / 180)},${y - 40 * Math.sin(angle * Math.PI / 180)}`}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1}
        opacity={0.6}
      />
      {/* Angle label */}
      <text
        x={x + 50}
        y={y - 10}
        fill="hsl(var(--primary))"
        fontSize={11}
        fontFamily="JetBrains Mono"
      >
        α={angle}°
      </text>
      {element.label && (
        <text
          x={x + w / 2}
          y={y + 20}
          fill="hsl(var(--muted-foreground))"
          fontSize={11}
          fontFamily="Inter"
          textAnchor="middle"
        >
          {element.label}
        </text>
      )}
    </g>
  );
};

export default SlopeRenderer;
