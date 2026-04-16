import React from "react";
import type { DiagramElement } from "@/types/cognitive";

interface Props {
  element: DiagramElement;
}

const SpringRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const h = element.dimensions?.height ?? 100;
  const coils = Number(element.properties?.coils ?? 8);
  const w = 12;

  const points: string[] = [`${x},${y}`];
  const segH = h / (coils * 2 + 2);
  let cy = y + segH;
  for (let i = 0; i < coils; i++) {
    points.push(`${x + (i % 2 === 0 ? w : -w)},${cy}`);
    cy += segH * 2;
  }
  points.push(`${x},${y + h}`);

  return (
    <g>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="hsl(var(--foreground) / 0.5)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {element.label && (
        <text
          x={x + w + 8}
          y={y + h / 2}
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

export default SpringRenderer;
