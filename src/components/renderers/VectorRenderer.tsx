import React from "react";
import type { ResolvedForce } from "@/types/cognitive";

interface Props {
  force: ResolvedForce;
  highlighted?: boolean;
}

/**
 * Renderer "bête" — reçoit start/end déjà calculés par le layout engine.
 */
const VectorRenderer: React.FC<Props> = ({ force, highlighted }) => {
  const { x: x1, y: y1 } = force.start;
  const { x: x2, y: y2 } = force.end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;

  const color = force.color;
  const markerId = `arrow-${force.id}`;

  return (
    <g
      opacity={highlighted ? 1 : 0.85}
      className="transition-opacity duration-300"
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="9"
          markerHeight="7"
          refX="8"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 9 3.5, 0 7" fill={color} />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={highlighted ? 2.8 : 2}
        markerEnd={`url(#${markerId})`}
      />
      <text
        x={x2 + ux * 14}
        y={y2 + uy * 14}
        fill={color}
        fontSize={12}
        fontFamily="JetBrains Mono"
        fontWeight={600}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {force.label}
      </text>
      {force.magnitude && (
        <text
          x={x2 + ux * 14}
          y={y2 + uy * 14 + 13}
          fill={color}
          fontSize={9}
          fontFamily="JetBrains Mono"
          textAnchor="middle"
          opacity={0.75}
        >
          {force.magnitude}
        </text>
      )}
    </g>
  );
};

export default VectorRenderer;
