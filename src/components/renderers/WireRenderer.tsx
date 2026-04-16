import React from "react";
import type { DiagramElement } from "@/types/cognitive";

interface Props {
  element: DiagramElement;
}

const WireRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const endX = x + (element.dimensions?.width ?? 100);
  const endY = y + (element.dimensions?.height ?? 0);

  return (
    <line
      x1={x}
      y1={y}
      x2={endX}
      y2={endY}
      stroke="hsl(var(--foreground) / 0.4)"
      strokeWidth={1.5}
    />
  );
};

export default WireRenderer;
