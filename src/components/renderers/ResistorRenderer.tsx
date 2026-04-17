import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
}

const ResistorRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const w = element.size?.w ?? 60;
  const h = 14;
  const zigW = w / 6;

  const path = [
    `M ${x} ${y}`,
    `L ${x + zigW} ${y}`,
    `L ${x + zigW * 1.5} ${y - h}`,
    `L ${x + zigW * 2.5} ${y + h}`,
    `L ${x + zigW * 3.5} ${y - h}`,
    `L ${x + zigW * 4.5} ${y + h}`,
    `L ${x + zigW * 5} ${y}`,
    `L ${x + w} ${y}`,
  ].join(" ");

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke="hsl(var(--foreground) / 0.5)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {element.label && (
        <text
          x={x + w / 2}
          y={y - h - 6}
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

export default ResistorRenderer;
