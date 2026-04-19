import React from "react";
import type { ResolvedElement } from "@/types/cognitive";

interface Props {
  element: ResolvedElement;
}

const CurrentFlowRenderer: React.FC<Props> = ({ element }) => {
  const { x, y } = element.position;
  return (
    <g>
      <circle cx={x} cy={y} r={6} fill="hsl(var(--primary) / 0.15)" />
      <circle cx={x} cy={y} r={3} fill="hsl(var(--primary))" />
    </g>
  );
};

export default CurrentFlowRenderer;
