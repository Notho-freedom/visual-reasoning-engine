import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
}

const WireRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  const endX = element.end?.x ?? x + 100;
  const endY = element.end?.y ?? y;

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
