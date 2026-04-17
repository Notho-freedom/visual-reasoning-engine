import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
}

/**
 * Arc d'angle. meta.angleDeg, meta.radius, meta.fromVertical (true pour pendule).
 */
const AngleArcRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const angleDeg = Number(element.meta?.angleDeg ?? 30);
  const radius = Number(element.meta?.radius ?? 32);
  const fromVertical = element.meta?.fromVertical === true;
  const a = (angleDeg * Math.PI) / 180;

  let x1: number, y1: number, x2: number, y2: number, mx: number, my: number;
  if (fromVertical) {
    // Du bas (vertical) vers la corde inclinée
    x1 = x;
    y1 = y + radius;
    x2 = x + Math.sin(a) * radius;
    y2 = y + Math.cos(a) * radius;
    mx = x + Math.sin(a / 2) * (radius + 12);
    my = y + Math.cos(a / 2) * (radius + 12);
  } else {
    // Depuis l'horizontale (axe x), montant à angle α
    x1 = x + radius;
    y1 = y;
    x2 = x + Math.cos(a) * radius;
    y2 = y - Math.sin(a) * radius;
    mx = x + Math.cos(a / 2) * (radius + 14);
    my = y - Math.sin(a / 2) * (radius + 14);
  }

  return (
    <g>
      <path
        d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 ${fromVertical ? 1 : 0} ${x2} ${y2}`}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1.2}
        opacity={0.75}
      />
      {element.label && (
        <text
          x={mx}
          y={my}
          fill="hsl(var(--primary))"
          fontSize={11}
          fontFamily="JetBrains Mono"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {element.label}
        </text>
      )}
    </g>
  );
};

export default AngleArcRenderer;
