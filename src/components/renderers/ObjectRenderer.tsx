import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
  highlighted?: boolean;
}

const ObjectRenderer: React.FC<Props> = ({ element, highlighted }) => {
  const cx = element.position.x;
  const cy = element.position.y;
  const w = element.size?.w ?? 36;
  const h = element.size?.h ?? 36;
  const rot = element.rotationDeg ?? 0;
  const isBall = element.type === "ball";

  const fill = highlighted ? "hsl(217 91% 60% / 0.18)" : "hsl(var(--card))";
  const stroke = highlighted ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.55)";

  return (
    <g transform={`rotate(${rot}, ${cx}, ${cy})`}>
      {isBall ? (
        <circle
          cx={cx}
          cy={cy}
          r={w / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={highlighted ? 2 : 1.5}
          className="transition-all duration-300"
        />
      ) : (
        <rect
          x={cx - w / 2}
          y={cy - h / 2}
          width={w}
          height={h}
          rx={2}
          fill={fill}
          stroke={stroke}
          strokeWidth={highlighted ? 2 : 1.5}
          className="transition-all duration-300"
        />
      )}
      {/* Centre de masse */}
      <circle cx={cx} cy={cy} r={2.2} fill={highlighted ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.7)"} />
      {element.label && (
        <text
          x={cx}
          y={cy - h / 2 - 8}
          fill="hsl(var(--foreground))"
          fontSize={12}
          fontFamily="Inter"
          fontWeight={500}
          textAnchor="middle"
          transform={`rotate(${-rot}, ${cx}, ${cy - h / 2 - 8})`}
        >
          {element.label}
        </text>
      )}
    </g>
  );
};

export default ObjectRenderer;
