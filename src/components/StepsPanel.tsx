import React from "react";
import { cn } from "@/lib/utils";
import type { TimelineStep } from "@/types/cognitive";
import { BookOpen, Calculator, Replace, CheckCircle2, Image, Play, Axis3D } from "lucide-react";

interface StepsPanelProps {
  steps: TimelineStep[];
  currentStep: number;
  onStepClick: (index: number) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  concept: <BookOpen className="h-3.5 w-3.5" />,
  equation: <Calculator className="h-3.5 w-3.5" />,
  substitution: <Replace className="h-3.5 w-3.5" />,
  solve: <CheckCircle2 className="h-3.5 w-3.5" />,
  diagram: <Image className="h-3.5 w-3.5" />,
  motion: <Play className="h-3.5 w-3.5" />,
  projection: <Axis3D className="h-3.5 w-3.5" />,
};

const StepsPanel: React.FC<StepsPanelProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="space-y-1">
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isPast = i < currentStep;

        return (
          <button
            key={step.id}
            onClick={() => onStepClick(i)}
            className={cn(
              "w-full text-left rounded-2xl px-4 py-3 transition-all duration-200 group bg-card",
              isActive
                ? "border border-foreground shadow-soft"
                : "border border-border hover:border-foreground/30",
              isPast && !isActive && "opacity-70"
            )}
          >
            <div className="flex items-start gap-2.5">
              <div className={cn(
                "mt-0.5 flex-shrink-0 rounded p-1",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {typeIcons[step.type] || <BookOpen className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-sm font-medium leading-tight",
                  isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {step.title}
                </p>
                {step.formula && (
                  <p className="text-xs font-mono text-primary/70 mt-1 truncate">
                    {step.formula}
                  </p>
                )}
                {isActive && step.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {step.description}
                  </p>
                )}
                {isActive && step.result && (
                  <div className="mt-2 space-y-0.5">
                    {Object.entries(step.result).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="text-primary">=</span>
                        <span className="text-foreground">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-mono flex-shrink-0 mt-0.5",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {i + 1}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default StepsPanel;
