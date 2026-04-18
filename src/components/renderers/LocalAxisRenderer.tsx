import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
}

/**
 * Repère LOCAL — lié à un solide. meta.rotationDeg = rotation des axes (sens horaire SVG).
 * meta.labelX, meta.labelY pour personnaliser les labels (par défaut x', y').
 */
const LocalAxisRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const rot = Number(element.meta?.rotationDeg ?? 0);
  const len = Number(element.meta?.length ?? 36);
  const labelX = String(element.meta?.labelX ?? "x'");
  const labelY = String(element.meta?.labelY ?? "y'");
  const color = "hsl(var(--secondary-foreground))";

  // En SVG: rotation horaire. Nos axes physiques: x à droite, y en haut.
  const rad = (rot * Math.PI) / 180;
  // axe x' tourné de rot autour de l'origine
  const xEnd = { x: x + Math.cos(rad) * len, y: y - Math.sin(rad) * len };
  // axe y' = perpendiculaire
  const yEnd = { x: x - Math.sin(rad) * len, y: y - Math.cos(rad) * len };

  return (
    <g opacity={0.85}>
      {/* X' */}
      <line x1={x} y1={y} x2={xEnd.x} y2={xEnd.y} stroke={color} strokeWidth={1.2} strokeDasharray="3 2" />
      <text x={xEnd.x + Math.cos(rad) * 10} y={xEnd.y - Math.sin(rad) * 10} fill={color} fontSize={10} fontFamily="JetBrains Mono" textAnchor="middle" dominantBaseline="central">{labelX}</text>
      {/* Y' */}
      <line x1={x} y1={y} x2={yEnd.x} y2={yEnd.y} stroke={color} strokeWidth={1.2} strokeDasharray="3 2" />
      <text x={yEnd.x - Math.sin(rad) * 10} y={yEnd.y - Math.cos(rad) * 10} fill={color} fontSize={10} fontFamily="JetBrains Mono" textAnchor="middle" dominantBaseline="central">{labelY}</text>
      {/* origine */}
      <circle cx={x} cy={y} r={2} fill={color} />
    </g>
  );
};

export default LocalAxisRenderer;
