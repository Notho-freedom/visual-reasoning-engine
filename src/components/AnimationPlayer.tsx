import React, { useEffect, useRef, useState } from "react";
import {
  Play, Pause, RotateCcw, Gauge, ChevronLeft, ChevronRight,
  Link2, Unlink, Maximize2, Camera, Eye, EyeOff, Copy, ZoomIn, ZoomOut,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface AnimationPlayerProps {
  duration: number;
  t: number;
  onTimeChange: (t: number) => void;
  phaseLabel?: string;
  currentStep?: number;
  totalSteps?: number;
  onPrevStep?: () => void;
  onNextStep?: () => void;
  syncEnabled?: boolean;
  onToggleSync?: () => void;
  // New
  onFullscreen?: () => void;
  onScreenshot?: () => void;
  showForces?: boolean;
  onToggleForces?: () => void;
  zoom?: number;
  onZoomChange?: (z: number) => void;
  onCopyStep?: () => void;
}

const SPEEDS = [0.25, 0.5, 1, 2];

const IconBtn: React.FC<{
  onClick?: () => void; disabled?: boolean; active?: boolean; label: string; children: React.ReactNode;
}> = ({ onClick, disabled, active, label, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`h-8 w-8 rounded-full flex items-center justify-center transition shrink-0 ${
          active
            ? "bg-primary text-primary-foreground"
            : "text-foreground/70 hover:text-foreground hover:bg-secondary"
        } disabled:opacity-30`}
        aria-label={label}
      >{children}</button>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-[10px]">{label}</TooltipContent>
  </Tooltip>
);

const AnimationPlayer: React.FC<AnimationPlayerProps> = ({
  duration, t, onTimeChange, phaseLabel,
  currentStep, totalSteps, onPrevStep, onNextStep, syncEnabled, onToggleSync,
  onFullscreen, onScreenshot, showForces = true, onToggleForces, zoom = 1, onZoomChange, onCopyStep,
}) => {
  const { toast } = useToast();
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const lastTickRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(t);

  useEffect(() => { tRef.current = t; }, [t]);

  useEffect(() => {
    if (!playing) {
      lastTickRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const loop = (now: number) => {
      if (lastTickRef.current == null) lastTickRef.current = now;
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      let next = tRef.current + dt * speed;
      if (next >= duration) {
        next = duration;
        setPlaying(false);
        onTimeChange(next);
        return;
      }
      tRef.current = next;
      onTimeChange(next);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed, duration, onTimeChange]);

  const togglePlay = () => {
    if (t >= duration) { onTimeChange(0); tRef.current = 0; }
    setPlaying((p) => !p);
  };
  const reset = () => { setPlaying(false); tRef.current = 0; onTimeChange(0); };

  const zoomOut = () => onZoomChange?.(Math.max(0.5, +(zoom - 0.1).toFixed(2)));
  const zoomIn = () => onZoomChange?.(Math.min(2, +(zoom + 0.1).toFixed(2)));

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1.5 px-3 py-2">
        <IconBtn label={playing ? "Pause" : "Lecture"} onClick={togglePlay}>
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </IconBtn>
        <IconBtn label="Réinitialiser" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" />
        </IconBtn>

        <div className="flex-1 flex items-center gap-2 min-w-0 px-2">
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0 w-12">
            {t.toFixed(2)}s
          </span>
          <Slider
            value={[t]}
            min={0}
            max={duration}
            step={duration / 200}
            onValueChange={([v]) => { setPlaying(false); onTimeChange(v); }}
            className="flex-1"
          />
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0 w-12 text-right">
            {duration.toFixed(2)}s
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-border ml-1">
          <Gauge className="h-3.5 w-3.5 text-muted-foreground mx-1" />
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`h-6 px-2 rounded-full text-[10px] font-medium transition ${
                speed === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >{s}x</button>
          ))}
        </div>

        {typeof totalSteps === "number" && totalSteps > 0 && (
          <div className="shrink-0 flex items-center gap-0.5 pl-2 ml-1 border-l border-border">
            {onToggleSync && (
              <IconBtn label={syncEnabled ? "Sync activée" : "Sync désactivée"} active={syncEnabled} onClick={onToggleSync}>
                {syncEnabled ? <Link2 className="h-3.5 w-3.5" /> : <Unlink className="h-3.5 w-3.5" />}
              </IconBtn>
            )}
            <IconBtn label="Étape précédente" disabled={(currentStep ?? 0) <= 0} onClick={onPrevStep}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </IconBtn>
            <span className="text-[10px] font-mono text-muted-foreground tabular-nums px-1 min-w-[40px] text-center">
              {(currentStep ?? 0) + 1}/{totalSteps}
            </span>
            <IconBtn label="Étape suivante" disabled={(currentStep ?? 0) >= totalSteps - 1} onClick={onNextStep}>
              <ChevronRight className="h-3.5 w-3.5" />
            </IconBtn>
          </div>
        )}

        <div className="shrink-0 flex items-center gap-0.5 pl-2 ml-1 border-l border-border">
          {onToggleForces && (
            <IconBtn label={showForces ? "Masquer les forces" : "Afficher les forces"} active={!showForces} onClick={onToggleForces}>
              {showForces ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </IconBtn>
          )}
          {onZoomChange && (
            <>
              <IconBtn label="Zoom -" onClick={zoomOut}><ZoomOut className="h-3.5 w-3.5" /></IconBtn>
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-9 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <IconBtn label="Zoom +" onClick={zoomIn}><ZoomIn className="h-3.5 w-3.5" /></IconBtn>
            </>
          )}
          {onCopyStep && (
            <IconBtn label="Copier l'étape" onClick={() => { onCopyStep(); toast({ title: "Étape copiée" }); }}>
              <Copy className="h-3.5 w-3.5" />
            </IconBtn>
          )}
          {onScreenshot && (
            <IconBtn label="Capture d'écran" onClick={onScreenshot}>
              <Camera className="h-3.5 w-3.5" />
            </IconBtn>
          )}
          {onFullscreen && (
            <IconBtn label="Plein écran" onClick={onFullscreen}>
              <Maximize2 className="h-3.5 w-3.5" />
            </IconBtn>
          )}
        </div>

        {phaseLabel && (
          <div className="shrink-0 px-2.5 py-1 rounded-full bg-secondary ml-2">
            <span className="text-[10px] font-medium text-foreground uppercase tracking-wider">{phaseLabel}</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default AnimationPlayer;
