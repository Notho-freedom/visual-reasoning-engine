import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
}

/**
 * Trajectoire du projectile. meta.points contient un JSON.stringify d'un tableau de {x,y}.
 */
const ProjectilePathRenderer: React.FC<Props> = ({ element }) => {
  let pts: { x: number; y: number }[] = [];
  try {
    pts = JSON.parse(String(element.meta?.points ?? "[]"));
  } catch {
    pts = [];
  }
  if (pts.length < 2) return null;

  const polyPts = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const apex = pts.reduce((min, p) => (p.y < min.y ? p : min), pts[0]);

  return (
    <g>
      <polyline
        points={polyPts}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        opacity={0.6}
      />
      {element.label && (
        <text
          x={apex.x}
          y={apex.y - 10}
          fill="hsl(var(--primary))"
          fontSize={10}
          fontFamily="JetBrains Mono"
          textAnchor="middle"
          opacity={0.75}
        >
          {element.label}
        </text>
      )}
    </g>
  );
};

export default ProjectilePathRenderer;
