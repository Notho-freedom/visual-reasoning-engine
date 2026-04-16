import React from "react";
import { Slider } from "@/components/ui/slider";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ControlsPanelProps {
  constants: Record<string, number>;
  onConstantChange: (key: string, value: number) => void;
  currentStep: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
}

const CONSTANT_META: Record<string, { label: string; unit: string; min: number; max: number; step: number }> = {
  g: { label: "Gravité", unit: "m/s²", min: 1, max: 25, step: 0.1 },
  m: { label: "Masse", unit: "kg", min: 0.1, max: 100, step: 0.1 },
  m1: { label: "Masse 1", unit: "kg", min: 0.1, max: 100, step: 0.1 },
  m2: { label: "Masse 2", unit: "kg", min: 0.1, max: 100, step: 0.1 },
  h: { label: "Hauteur", unit: "m", min: 0.1, max: 200, step: 0.5 },
  v0: { label: "Vitesse initiale", unit: "m/s", min: 0, max: 100, step: 0.5 },
  alpha: { label: "Angle", unit: "°", min: 0, max: 90, step: 1 },
  theta: { label: "Angle de tir", unit: "°", min: 0, max: 90, step: 1 },
  mu: { label: "Coeff. frottement", unit: "", min: 0, max: 1, step: 0.01 },
  k: { label: "Constante de raideur", unit: "N/m", min: 1, max: 1000, step: 1 },
  L: { label: "Longueur", unit: "m", min: 0.1, max: 10, step: 0.1 },
  R: { label: "Résistance", unit: "Ω", min: 1, max: 10000, step: 1 },
  U: { label: "Tension", unit: "V", min: 0.1, max: 240, step: 0.1 },
  C: { label: "Capacité", unit: "μF", min: 0.1, max: 1000, step: 0.1 },
  x: { label: "Déformation", unit: "m", min: 0, max: 2, step: 0.01 },
};

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  constants,
  onConstantChange,
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  onReset,
}) => {
  return (
    <div className="space-y-4">
      {/* Step navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={currentStep <= 0}
          className="text-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          Préc
        </Button>
        <span className="text-xs font-mono text-muted-foreground">
          {currentStep + 1} / {totalSteps}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={currentStep >= totalSteps - 1}
          className="text-xs"
        >
          Suiv
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onReset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Dynamic sliders */}
      {Object.entries(constants).map(([key, val]) => {
        const meta = CONSTANT_META[key] || {
          label: key,
          unit: "",
          min: 0,
          max: val * 5 || 100,
          step: val > 10 ? 1 : 0.1,
        };

        return (
          <div key={key}>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs text-muted-foreground">
                {meta.label}
              </label>
              <span className="text-xs font-mono text-foreground">
                {val}{meta.unit && ` ${meta.unit}`}
              </span>
            </div>
            <Slider
              value={[val]}
              min={meta.min}
              max={meta.max}
              step={meta.step}
              onValueChange={([v]) => onConstantChange(key, v)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ControlsPanel;
