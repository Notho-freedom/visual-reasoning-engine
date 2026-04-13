import React, { useEffect, useRef, useState, useCallback } from "react";
import type { CognitiveJSON, TimelineStep } from "@/types/cognitive";

interface PhysicsCanvasProps {
  data: CognitiveJSON;
  currentStep: number;
  isPlaying: boolean;
  height: number;
  gravity: number;
}

const PhysicsCanvas: React.FC<PhysicsCanvasProps> = ({
  data,
  currentStep,
  isPlaying,
  height,
  gravity,
}) => {
  const [animProgress, setAnimProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const totalTime = Math.sqrt((2 * height) / gravity);
  const step = data.timeline[currentStep];
  const showMotion = step?.type === "motion" || step?.type === "solve";
  const showVector = step?.type === "vector" || step?.type === "concept";

  const svgWidth = 600;
  const svgHeight = 500;
  const groundY = svgHeight - 60;
  const topY = 80;
  const scaleY = (groundY - topY) / height;

  const currentY = showMotion && isPlaying
    ? topY + (0.5 * gravity * (animProgress * totalTime) ** 2) * scaleY
    : topY;

  const clampedY = Math.min(currentY, groundY);

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = (timestamp - startTimeRef.current) / 1000;
    const progress = Math.min(elapsed / totalTime, 1);
    setAnimProgress(progress);

    if (progress < 1) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [totalTime]);

  useEffect(() => {
    if (isPlaying && showMotion) {
      startTimeRef.current = 0;
      setAnimProgress(0);
      rafRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, showMotion, animate, currentStep]);

  useEffect(() => {
    setAnimProgress(0);
    startTimeRef.current = 0;
  }, [height, gravity]);

  const objectX = svgWidth / 2;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full h-full"
      style={{ maxHeight: "500px" }}
    >
      {/* Grid background */}
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="hsl(220 15% 18% / 0.6)"
            strokeWidth="0.5"
          />
        </pattern>
        <filter id="glow-cyan">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-magenta">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={svgWidth} height={svgHeight} fill="hsl(220 20% 6%)" />
      <rect width={svgWidth} height={svgHeight} fill="url(#grid)" />

      {/* Height reference line */}
      <line
        x1={objectX - 60}
        y1={topY}
        x2={objectX - 60}
        y2={groundY}
        stroke="hsl(215 15% 35%)"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <text
        x={objectX - 75}
        y={(topY + groundY) / 2}
        fill="hsl(215 15% 55%)"
        fontSize="12"
        textAnchor="end"
        fontFamily="JetBrains Mono"
        transform={`rotate(-90, ${objectX - 75}, ${(topY + groundY) / 2})`}
      >
        h = {height}m
      </text>

      {/* Ground */}
      <line
        x1={40}
        y1={groundY}
        x2={svgWidth - 40}
        y2={groundY}
        stroke="hsl(150 100% 50%)"
        strokeWidth="2"
        filter="url(#glow-cyan)"
      />
      <text
        x={svgWidth - 45}
        y={groundY + 20}
        fill="hsl(150 100% 50%)"
        fontSize="11"
        textAnchor="end"
        fontFamily="JetBrains Mono"
      >
        sol (y=0)
      </text>

      {/* Gravity vector */}
      {showVector && (
        <g filter="url(#glow-magenta)">
          <line
            x1={objectX + 40}
            y1={topY + 10}
            x2={objectX + 40}
            y2={topY + 70}
            stroke="hsl(320 100% 53%)"
            strokeWidth="2.5"
            markerEnd="url(#arrowhead-magenta)"
          />
          <defs>
            <marker
              id="arrowhead-magenta"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="hsl(320 100% 53%)"
              />
            </marker>
          </defs>
          <text
            x={objectX + 55}
            y={topY + 45}
            fill="hsl(320 100% 53%)"
            fontSize="14"
            fontFamily="JetBrains Mono"
            fontWeight="bold"
          >
            g⃗
          </text>
          <text
            x={objectX + 55}
            y={topY + 60}
            fill="hsl(320 100% 70%)"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            {gravity} m/s²
          </text>
        </g>
      )}

      {/* Object (falling circle) */}
      <g filter="url(#glow-cyan)">
        <circle
          cx={objectX}
          cy={clampedY}
          r="16"
          fill="hsl(185 100% 50% / 0.2)"
          stroke="hsl(185 100% 50%)"
          strokeWidth="2"
        />
        <circle
          cx={objectX}
          cy={clampedY}
          r="4"
          fill="hsl(185 100% 50%)"
        />
      </g>

      {/* Trail */}
      {showMotion && isPlaying && animProgress > 0 && (
        <line
          x1={objectX}
          y1={topY}
          x2={objectX}
          y2={clampedY}
          stroke="hsl(185 100% 50% / 0.15)"
          strokeWidth="32"
          strokeLinecap="round"
        />
      )}

      {/* Position label */}
      <text
        x={objectX - 30}
        y={clampedY + 5}
        fill="hsl(185 100% 70%)"
        fontSize="10"
        textAnchor="end"
        fontFamily="JetBrains Mono"
      >
        {showMotion
          ? `y = ${(height - (0.5 * gravity * (animProgress * totalTime) ** 2)).toFixed(1)}m`
          : `y = ${height}m`
        }
      </text>

      {/* Time display */}
      {showMotion && isPlaying && (
        <text
          x={svgWidth - 20}
          y={30}
          fill="hsl(50 100% 60%)"
          fontSize="13"
          textAnchor="end"
          fontFamily="JetBrains Mono"
        >
          t = {(animProgress * totalTime).toFixed(2)}s
        </text>
      )}

      {/* Step info overlay */}
      <text
        x={20}
        y={30}
        fill="hsl(200 20% 92%)"
        fontSize="14"
        fontWeight="600"
        fontFamily="Space Grotesk"
      >
        {step?.title || ""}
      </text>
      {step?.formula && (
        <text
          x={20}
          y={50}
          fill="hsl(50 100% 60%)"
          fontSize="12"
          fontFamily="JetBrains Mono"
        >
          {step.formula}
        </text>
      )}
    </svg>
  );
};

export default PhysicsCanvas;
