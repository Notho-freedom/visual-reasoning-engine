import React from "react";
import { Slider } from "@/components/ui/slider";

interface ControlsPanelProps {
  height: number;
  gravity: number;
  onHeightChange: (v: number) => void;
  onGravityChange: (v: number) => void;
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onReset: () => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  height,
  gravity,
  onHeightChange,
  onGravityChange,
  currentStep,
  totalSteps,
  isPlaying,
  onPrev,
  onNext,
  onTogglePlay,
  onReset,
}) => {
  return (
    <div className="space-y-5">
      {/* Step navigation */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onPrev}
          disabled={currentStep <= 0}
          className="px-3 py-1.5 rounded-md bg-muted text-sm font-medium text-foreground disabled:opacity-30 hover:bg-muted/80 transition-colors"
        >
          ◀ Préc
        </button>
        <button
          onClick={onTogglePlay}
          className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors glow-cyan"
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <button
          onClick={onNext}
          disabled={currentStep >= totalSteps - 1}
          className="px-3 py-1.5 rounded-md bg-muted text-sm font-medium text-foreground disabled:opacity-30 hover:bg-muted/80 transition-colors"
        >
          Suiv ▶
        </button>
        <button
          onClick={onReset}
          className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          ↺
        </button>
      </div>

      {/* Sliders */}
      <div className="space-y-4 p-4 rounded-lg bg-card border border-border">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Hauteur
            </label>
            <span className="text-sm font-mono text-neon-cyan">{height}m</span>
          </div>
          <Slider
            value={[height]}
            min={1}
            max={100}
            step={1}
            onValueChange={([v]) => onHeightChange(v)}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Gravité
            </label>
            <span className="text-sm font-mono text-neon-magenta">{gravity} m/s²</span>
          </div>
          <Slider
            value={[gravity]}
            min={1}
            max={20}
            step={0.1}
            onValueChange={([v]) => onGravityChange(v)}
          />
        </div>
      </div>

      {/* Quick presets */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onGravityChange(9.81)}
          className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          🌍 Terre
        </button>
        <button
          onClick={() => onGravityChange(1.62)}
          className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          🌙 Lune
        </button>
        <button
          onClick={() => onGravityChange(3.72)}
          className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          🔴 Mars
        </button>
        <button
          onClick={() => onGravityChange(24.79)}
          className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          🪐 Jupiter
        </button>
      </div>
    </div>
  );
};

export default ControlsPanel;
