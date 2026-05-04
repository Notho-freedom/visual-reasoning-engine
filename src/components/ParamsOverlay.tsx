import React from "react";
import { X, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  constants: Record<string, number>;
  initialConstants: Record<string, number>;
  onChange: (k: string, v: number) => void;
  onReset: () => void;
}

const META: Record<string, { label: string; unit: string; min: number; max: number; step: number }> = {
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
  F: { label: "Force", unit: "N", min: 0, max: 200, step: 0.5 },
};

const ParamsOverlay: React.FC<Props> = ({ open, onClose, constants, initialConstants, onChange, onReset }) => {
  if (!open) return null;
  const entries = Object.entries(constants);
  const modifiedCount = entries.filter(([k, v]) => initialConstants[k] !== undefined && Math.abs(v - initialConstants[k]) > 1e-6).length;

  return (
    <div className="absolute top-3 right-3 z-30 w-[340px] max-h-[calc(100%-1.5rem)] flex flex-col rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-elevated animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="px-4 h-11 shrink-0 border-b border-border/60 flex items-center gap-2">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paramètres</span>
        {modifiedCount > 0 && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
            {modifiedCount} modif.
          </span>
        )}
        <button
          onClick={onReset}
          disabled={modifiedCount === 0}
          className="ml-auto h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground disabled:opacity-30"
          title="Réinitialiser"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button onClick={onClose} className="h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-3">
        {entries.length === 0 && (
          <div className="text-[12px] text-muted-foreground italic py-6 text-center">
            Aucun paramètre détecté dans cet énoncé.
          </div>
        )}
        {entries.map(([key, val]) => {
          const meta = META[key] || {
            label: key,
            unit: "",
            min: Math.min(0, val * 0.5),
            max: (Math.abs(val) || 1) * 5,
            step: Math.abs(val) > 10 ? 1 : 0.1,
          };
          const isModified = initialConstants[key] !== undefined && Math.abs(val - initialConstants[key]) > 1e-6;
          const decimals = meta.step < 1 ? 2 : 0;
          return (
            <div key={key} className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", isModified ? "bg-primary" : "bg-transparent")} />
                <label className="text-[11px] text-foreground/80 font-medium truncate flex-1">
                  {meta.label}
                  <span className="text-muted-foreground font-mono ml-1.5 text-[10px]">{key}</span>
                </label>
                <input
                  type="number"
                  value={Number(val).toFixed(decimals)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v)) onChange(key, v);
                  }}
                  step={meta.step}
                  className="w-16 h-6 px-1.5 text-right text-[11px] font-mono rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                />
                {meta.unit && (
                  <span className="text-[10px] text-muted-foreground font-mono w-8 shrink-0">{meta.unit}</span>
                )}
              </div>
              <Slider
                value={[val]}
                min={meta.min}
                max={meta.max}
                step={meta.step}
                onValueChange={([v]) => onChange(key, v)}
              />
            </div>
          );
        })}
      </div>

      <div className="border-t border-border/60 px-4 py-2 text-[10px] text-muted-foreground">
        Les modifications s'appliquent en direct au schéma et aux résultats.
      </div>
    </div>
  );
};

export default ParamsOverlay;
