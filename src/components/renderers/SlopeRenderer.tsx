import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
}

/**
 * Triangle de pente. Utilise meta.x1/y1/x2/y2/x3/y3 (coords SVG).
 */
const SlopeRenderer: React.FC<Props> = ({ element }) => {
  const m = element.meta as Record<string, number> | undefined;
  if (!m) return null;
  const points = `${m.x1},${m.y1} ${m.x2},${m.y2} ${m.x3},${m.y3}`;

  return (
    <g>
      <polygon
        points={points}
        fill="hsl(var(--secondary) / 0.35)"
        stroke="hsl(var(--foreground) / 0.4)"
        strokeWidth={1.5}
      />
      {/* Hachures sous la base */}
      {Array.from({ length: 14 }).map((_, i) => {
        const t = i / 14;
        const px = m.x1 + (m.x2 - m.x1) * t;
        const py = m.y1 + (m.y2 - m.y1) * t;
        return (
          <line
            key={i}
            x1={px}
            y1={py}
            x2={px - 6}
            y2={py + 8}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeOpacity={0.4}
          />
        );
      })}
      {element.label && (
        <text
          x={(m.x1 + m.x2 + m.x3) / 3}
          y={(m.y1 + m.y2 + m.y3) / 3}
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
