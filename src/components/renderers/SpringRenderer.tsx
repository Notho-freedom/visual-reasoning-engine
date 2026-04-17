import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
}

/**
 * Ressort en zig-zag entre position (start) et end.
 */
const SpringRenderer: React.FC<Props> = ({ element }) => {
  const x1 = element.position.x;
  const y1 = element.position.y;
  const x2 = element.end?.x ?? x1;
  const y2 = element.end?.y ?? y1 + 100;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  const coils = Number(element.meta?.coils ?? 8);
  const amp = 10;

  // pad début / fin pour les pattes droites
  const pad = 10;
  const usable = Math.max(len - pad * 2, 20);
  const seg = usable / (coils * 2);

  const pts: string[] = [];
  pts.push(`${x1},${y1}`);
  pts.push(`${x1 + ux * pad},${y1 + uy * pad}`);
  for (let i = 1; i <= coils * 2; i++) {
    const baseX = x1 + ux * (pad + seg * i);
    const baseY = y1 + uy * (pad + seg * i);
    const sign = i % 2 === 0 ? -1 : 1;
    pts.push(`${baseX + px * amp * sign},${baseY + py * amp * sign}`);
  }
  pts.push(`${x2 - ux * pad},${y2 - uy * pad}`);
  pts.push(`${x2},${y2}`);

  return (
    <g>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="hsl(var(--foreground) / 0.65)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {element.label && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - amp - 6}
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

export default SpringRenderer;
