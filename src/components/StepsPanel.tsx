import React from "react";
import type { TimelineStep } from "@/types/cognitive";
import { cn } from "@/lib/utils";

interface StepsPanelProps {
  steps: TimelineStep[];
  currentStep: number;
  onStepClick: (index: number) => void;
}

const typeIcons: Record<string, string> = {
  concept: "💡",
  vector: "➡️",
  equation: "📐",
  solve: "✅",
  motion: "🎬",
};

const typeColors: Record<string, string> = {
  concept: "border-neon-cyan/50 bg-neon-cyan/5",
  vector: "border-neon-magenta/50 bg-neon-magenta/5",
  equation: "border-neon-yellow/50 bg-neon-yellow/5",
  solve: "border-neon-green/50 bg-neon-green/5",
  motion: "border-neon-cyan/50 bg-neon-cyan/5",
};

const StepsPanel: React.FC<StepsPanelProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Étapes de résolution
      </h3>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isPast = index < currentStep;

        return (
          <button
            key={step.id}
            onClick={() => onStepClick(index)}
            className={cn(
              "text-left p-3 rounded-lg border transition-all duration-300 cursor-pointer",
              typeColors[step.type] || "border-border bg-card",
              isActive && "ring-1 ring-primary glow-cyan scale-[1.02]",
              isPast && "opacity-60",
              !isActive && !isPast && "opacity-80 hover:opacity-100"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{typeIcons[step.type] || "📎"}</span>
              <span className={cn(
                "text-xs font-mono uppercase tracking-wide",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {step.type}
              </span>
              <span className="ml-auto text-xs text-muted-foreground font-mono">
                {index + 1}/{steps.length}
              </span>
            </div>
            <p className={cn(
              "text-sm font-medium",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}>
              {step.title}
            </p>
            {step.formula && (
              <p className="text-xs font-mono text-neon-yellow mt-1">
                {step.formula}
              </p>
            )}
            {step.result && (
              <div className="mt-1 flex gap-2 flex-wrap">
                {Object.entries(step.result).map(([key, val]) => (
                  <span key={key} className="text-xs font-mono text-neon-green">
                    {key} = {val}
                  </span>
                ))}
              </div>
            )}
            {step.description && isActive && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {step.description}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default StepsPanel;
