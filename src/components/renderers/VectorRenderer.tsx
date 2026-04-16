import React from "react";
import type { Force } from "@/types/cognitive";

interface Props {
  force: Force;
  highlighted?: boolean;
}

const VectorRenderer: React.FC<Props> = ({ force, highlighted }) => {
  const { x: px, y: py } = force.application_point;
  const scale = 60;
  const len = Math.sqrt(force.direction.x ** 2 + force.direction.y ** 2);
  const nx = len > 0 ? force.direction.x / len : 0;
  const ny = len > 0 ? force.direction.y / len : 0;
  const ex = px + nx * scale;
  const ey = py + ny * scale;

  const color = force.color || (highlighted ? "hsl(217, 91%, 60%)" : "hsl(0, 72%, 51%)");
  const markerId = `arrow-${force.id}`;

  return (
    <g opacity={highlighted ? 1 : 0.7} className="transition-opacity duration-300">
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill={color} />
        </marker>
      </defs>
      <line
        x1={px}
        y1={py}
        x2={ex}
        y2={ey}
        stroke={color}
        strokeWidth={highlighted ? 2.5 : 2}
        markerEnd={`url(#${markerId})`}
      />
      <text
        x={ex + nx * 12}
        y={ey + ny * 12}
        fill={color}
        fontSize={11}
        fontFamily="JetBrains Mono"
        fontWeight={500}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {force.label}
      </text>
      {force.magnitude && (
        <text
          x={ex + nx * 12}
          y={ey + ny * 12 + 14}
          fill={color}
          fontSize={9}
          fontFamily="JetBrains Mono"
          textAnchor="middle"
          opacity={0.7}
        >
          {force.magnitude}
        </text>
      )}
    </g>
  );
};

export default VectorRenderer;
