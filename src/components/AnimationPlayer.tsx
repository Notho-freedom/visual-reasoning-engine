import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Gauge } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface AnimationPlayerProps {
  duration: number;
  t: number;
  onTimeChange: (t: number) => void;
  phaseLabel?: string;
}

const SPEEDS = [0.25, 0.5, 1, 2];

const AnimationPlayer: React.FC<AnimationPlayerProps> = ({ duration, t, onTimeChange, phaseLabel }) => {
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
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, speed, duration, onTimeChange]);

  const togglePlay = () => {
    if (t >= duration) {
      onTimeChange(0);
      tRef.current = 0;
    }
    setPlaying((p) => !p);
  };

  const reset = () => {
    setPlaying(false);
    tRef.current = 0;
    onTimeChange(0);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-lg">
      <button
        onClick={togglePlay}
        className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition shrink-0"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <button
        onClick={reset}
        className="h-8 w-8 rounded-md bg-secondary hover:bg-accent text-foreground flex items-center justify-center transition shrink-0"
        aria-label="Reset"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>

      <div className="flex-1 flex items-center gap-3 min-w-0">
        <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0 w-14">
          {t.toFixed(2)}s
        </span>
        <Slider
          value={[t]}
          min={0}
          max={duration}
          step={duration / 200}
          onValueChange={([v]) => {
            setPlaying(false);
            onTimeChange(v);
          }}
          className="flex-1"
        />
        <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0 w-14 text-right">
          {duration.toFixed(2)}s
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`h-7 px-2 rounded-md text-[10px] font-mono transition ${
              speed === s
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {phaseLabel && (
        <div className="shrink-0 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
          <span className="text-[10px] font-medium text-primary uppercase tracking-wider">{phaseLabel}</span>
        </div>
      )}
    </div>
  );
};

export default AnimationPlayer;
