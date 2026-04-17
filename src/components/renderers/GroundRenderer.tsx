import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
}

const GroundRenderer: React.FC<Props> = ({ element }) => {
  const x1 = element.position.x;
  const y1 = element.position.y;
  const x2 = element.end?.x ?? x1 + 400;
  const y2 = element.end?.y ?? y1;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const dx = (x2 - x1) / len;
  const dy = (y2 - y1) / len;
  // Normale extérieure (vers le bas pour un sol horizontal)
  const nx = -dy;
  const ny = dx;
  const hatchCount = Math.floor(len / 14);
  const hatchLen = 9;

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="hsl(var(--foreground))"
        strokeWidth={2}
        strokeOpacity={0.6}
      />
      {Array.from({ length: hatchCount }).map((_, i) => {
        const t = (i + 0.5) / hatchCount;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        return (
          <line
            key={i}
            x1={px}
            y1={py}
            x2={px - dx * hatchLen + nx * hatchLen}
            y2={py - dy * hatchLen + ny * hatchLen}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeOpacity={0.5}
          />
        );
      })}
      {element.label && (
        <text
          x={(x1 + x2) / 2}
          y={Math.max(y1, y2) + 22}
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

export default GroundRenderer;
