import React from "react";
import type { ResolvedForce } from "@/types/cognitive";

interface Props {
  force: ResolvedForce;
  origin: { x: number; y: number };
  /** rotation locale (degrés, sens trigonométrique : c'est l'angle des axes locaux par rapport au monde) */
  localRotationDeg: number;
}

/**
 * Décompose le vecteur `force` selon les axes locaux (x' tourné de localRotationDeg).
 * Dessine deux flèches en pointillés (Px', Py') depuis `origin`, dans la couleur de la force.
 */
const ForceProjectionRenderer: React.FC<Props> = ({ force, origin, localRotationDeg }) => {
  // Vecteur force en SVG (du start vers end)
  const fx = force.end.x - force.start.x;
  const fy = force.end.y - force.start.y;
  const mag = Math.hypot(fx, fy);
  if (mag < 1) return null;

  // Axes locaux en SVG : x' = (cos(rot), -sin(rot)) en coordonnées SVG (rot trigonométrique)
  const rad = (localRotationDeg * Math.PI) / 180;
  const ux = { x: Math.cos(rad), y: -Math.sin(rad) };  // axe x' SVG
  const uy = { x: -Math.sin(rad), y: -Math.cos(rad) }; // axe y' SVG (perpendiculaire, "haut")

  // Composantes scalaires
  const px = fx * ux.x + fy * ux.y;
  const py = fx * uy.x + fy * uy.y;

  const pxEnd = { x: origin.x + ux.x * px, y: origin.y + ux.y * px };
  const pyEnd = { x: origin.x + uy.x * py, y: origin.y + uy.y * py };

  const color = force.color;
  const idX = `proj-x-${force.id}`;
  const idY = `proj-y-${force.id}`;

  return (
    <g opacity={0.85}>
      <defs>
        <marker id={idX} markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
          <polygon points="0 0, 7 3, 0 6" fill={color} />
        </marker>
        <marker id={idY} markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
          <polygon points="0 0, 7 3, 0 6" fill={color} />
        </marker>
      </defs>
      {Math.abs(px) > 2 && (
        <>
          <line
            x1={origin.x} y1={origin.y}
            x2={pxEnd.x} y2={pxEnd.y}
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            markerEnd={`url(#${idX})`}
          />
          <text
            x={pxEnd.x + ux.x * 12}
            y={pxEnd.y + ux.y * 12}
            fill={color}
            fontSize={10}
            fontFamily="JetBrains Mono"
            fontWeight={600}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {force.label}ₓ'
          </text>
        </>
      )}
      {Math.abs(py) > 2 && (
        <>
          <line
            x1={origin.x} y1={origin.y}
            x2={pyEnd.x} y2={pyEnd.y}
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            markerEnd={`url(#${idY})`}
          />
          <text
            x={pyEnd.x + uy.x * 12}
            y={pyEnd.y + uy.y * 12}
            fill={color}
            fontSize={10}
            fontFamily="JetBrains Mono"
            fontWeight={600}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {force.label}ᵧ'
          </text>
        </>
      )}
      {/* Pointillés "rectangle de projection" */}
      {Math.abs(px) > 2 && Math.abs(py) > 2 && (
        <>
          <line x1={pxEnd.x} y1={pxEnd.y} x2={force.end.x} y2={force.end.y} stroke={color} strokeWidth={0.8} strokeDasharray="2 3" opacity={0.5} />
          <line x1={pyEnd.x} y1={pyEnd.y} x2={force.end.x} y2={force.end.y} stroke={color} strokeWidth={0.8} strokeDasharray="2 3" opacity={0.5} />
        </>
      )}
    </g>
  );
};

export default ForceProjectionRenderer;
