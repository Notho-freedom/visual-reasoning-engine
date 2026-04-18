import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
}

/** Repère MONDE — origine bas-gauche, fixe. Affiche échelle (1m). */
const WorldAxisRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const scalePxPerM = Number(element.meta?.scalePxPerM ?? 60);
  const len = Math.min(80, Math.max(40, scalePxPerM));
  const oneMeterPx = scalePxPerM;

  return (
    <g>
      {/* fond léger */}
      <rect
        x={x - 22}
        y={y - len - 10}
        width={len + 40}
        height={len + 32}
        fill="hsl(var(--background))"
        opacity={0.5}
        rx={6}
      />
      {/* X */}
      <line x1={x} y1={y} x2={x + len} y2={y} stroke="hsl(var(--foreground))" strokeWidth={1.4} />
      <polygon points={`${x + len},${y} ${x + len - 7},${y - 3.5} ${x + len - 7},${y + 3.5}`} fill="hsl(var(--foreground))" />
      <text x={x + len + 6} y={y + 4} fill="hsl(var(--foreground))" fontSize={12} fontFamily="JetBrains Mono" fontWeight={600}>x</text>
      {/* Y */}
      <line x1={x} y1={y} x2={x} y2={y - len} stroke="hsl(var(--foreground))" strokeWidth={1.4} />
      <polygon points={`${x},${y - len} ${x - 3.5},${y - len + 7} ${x + 3.5},${y - len + 7}`} fill="hsl(var(--foreground))" />
      <text x={x - 14} y={y - len - 2} fill="hsl(var(--foreground))" fontSize={12} fontFamily="JetBrains Mono" fontWeight={600}>y</text>
      {/* O */}
      <circle cx={x} cy={y} r={2.5} fill="hsl(var(--foreground))" />
      <text x={x - 14} y={y + 14} fill="hsl(var(--foreground))" fontSize={10} fontFamily="JetBrains Mono">O</text>
      {/* échelle 1m */}
      <line
        x1={x}
        y1={y + 12}
        x2={x + oneMeterPx}
        y2={y + 12}
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={1}
      />
      <line x1={x} y1={y + 9} x2={x} y2={y + 15} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
      <line x1={x + oneMeterPx} y1={y + 9} x2={x + oneMeterPx} y2={y + 15} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
      <text x={x + oneMeterPx / 2} y={y + 24} fill="hsl(var(--muted-foreground))" fontSize={9} fontFamily="JetBrains Mono" textAnchor="middle">1 m</text>
    </g>
  );
};

export default WorldAxisRenderer;
