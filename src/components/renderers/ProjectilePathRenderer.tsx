import React from "react";
import type { DiagramElement } from "@/types/cognitive";

interface Props {
  element: DiagramElement;
}

const ProjectilePathRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const range = element.dimensions?.width ?? 200;
  const maxH = element.dimensions?.height ?? 80;

  const pts: string[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x + t * range;
    const py = y - 4 * maxH * t * (1 - t);
    pts.push(`${px},${py}`);
  }

  return (
    <g>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.5}
      />
      {element.label && (
        <text
          x={x + range / 2}
          y={y - maxH - 10}
          fill="hsl(var(--primary))"
          fontSize={10}
          fontFamily="JetBrains Mono"
          textAnchor="middle"
          opacity={0.6}
        >
          {element.label}
        </text>
      )}
    </g>
  );
};

export default ProjectilePathRenderer;
