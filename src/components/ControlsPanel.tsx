import React from "react";
import { Slider } from "@/components/ui/slider";

interface ControlsPanelProps {
  constants: Record<string, number>;
  onConstantChange: (key: string, value: number) => void;
}

const CONSTANT_META: Record<string, { label: string; unit: string; min: number; max: number; step: number }> = {
  g: { label: "Gravité", unit: "m/s²", min: 1, max: 25, step: 0.1 },
  m: { label: "Masse", unit: "kg", min: 0.1, max: 100, step: 0.1 },
  m1: { label: "Masse 1", unit: "kg", min: 0.1, max: 100, step: 0.1 },
  m2: { label: "Masse 2", unit: "kg", min: 0.1, max: 100, step: 0.1 },
  h: { label: "Hauteur", unit: "m", min: 0.1, max: 50, step: 0.5 },
  v0: { label: "Vitesse v₀", unit: "m/s", min: 0, max: 60, step: 0.5 },
  alpha: { label: "Angle α", unit: "°", min: 0, max: 90, step: 1 },
  theta: { label: "Angle θ", unit: "°", min: 0, max: 90, step: 1 },
  mu: { label: "μ frottement", unit: "", min: 0, max: 1, step: 0.01 },
  k: { label: "Raideur k", unit: "N/m", min: 1, max: 500, step: 1 },
  L: { label: "Longueur", unit: "m", min: 0.1, max: 5, step: 0.1 },
  R: { label: "Résistance", unit: "Ω", min: 1, max: 10000, step: 1 },
  U: { label: "Tension", unit: "V", min: 0.1, max: 240, step: 0.1 },
  C: { label: "Capacité", unit: "μF", min: 0.1, max: 1000, step: 0.1 },
  x: { label: "Compression", unit: "m", min: 0, max: 1, step: 0.01 },
  a: { label: "Accélération", unit: "m/s²", min: -10, max: 10, step: 0.1 },
};

const ControlsPanel: React.FC<ControlsPanelProps> = ({ constants, onConstantChange }) => {
  const entries = Object.entries(constants);
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2.5">
      {entries.map(([key, val]) => {
        const meta = CONSTANT_META[key] || {
          label: key,
          unit: "",
          min: 0,
          max: val * 5 || 100,
          step: val > 10 ? 1 : 0.1,
        };
        return (
          <div key={key} className="min-w-0">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{meta.label}</label>
              <span className="text-[10px] font-mono text-foreground tabular-nums">
                {Number(val).toFixed(meta.step < 1 ? 2 : 0)}{meta.unit && ` ${meta.unit}`}
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
