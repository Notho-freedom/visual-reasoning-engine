import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Atom, PanelLeft, X, Sparkles, Loader2, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import SceneRenderer from "@/components/SceneRenderer";
import StepsPanel from "@/components/StepsPanel";
import ControlsPanel from "@/components/ControlsPanel";
import AnimationPlayer from "@/components/AnimationPlayer";
import { Button } from "@/components/ui/button";
import { parseExercise } from "@/lib/api";
import { computeLayout } from "@/lib/physics/layoutEngine";
import type { CognitiveJSON } from "@/types/cognitive";

const EXAMPLES = [
  "Un objet de 2 kg est lâché sans vitesse initiale d'une hauteur de 20 m. Calculer le temps de chute et la vitesse à l'arrivée.",
  "Un bloc de 5 kg glisse sur un plan incliné de 30° avec un coefficient de frottement μ=0.2. Déterminer l'accélération.",
  "Un projectile est lancé à 20 m/s avec un angle de 45°. Calculer la portée et la hauteur maximale.",
  "Deux masses 3 kg et 5 kg reliées par une corde sur une poulie. Calculer l'accélération.",
  "Un ressort k=200 N/m est comprimé de 10 cm avec une masse de 1 kg. Calculer l'énergie potentielle.",
  "Un pendule de longueur 1.5 m est lâché à 25°. Calculer la période.",
];

const Index = () => {
  const { toast } = useToast();
  const [exercise, setExercise] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<CognitiveJSON | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [constants, setConstants] = useState<Record<string, number>>({});
  const [t, setT] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSubmit = useCallback(async (text: string) => {
    setIsLoading(true);
    setData(null);
    setCurrentStep(0);
    setT(0);

    try {
      const result = await parseExercise(text);
      setData(result);
      setConstants(result.constants ?? {});
      toast({
        title: "Analyse terminée",
        description: `${result.timeline.length} étapes — ${result.meta.scenario}`,
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible d'analyser",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Recalcul du layout à chaque changement de t / constantes
  const scene = useMemo(() => {
    if (!data) return null;
    try {
      return computeLayout({ ...data, constants }, t);
    } catch (e) {
      console.error("Layout error:", e);
      return null;
    }
  }, [data, constants, t]);

  // Reset t quand on change les constantes principales
  useEffect(() => {
    setT(0);
  }, [data?.diagram?.scenario]);

  const totalSteps = data?.timeline.length || 0;
  const step = data?.timeline[currentStep];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-border px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="h-8 w-8 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Atom className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight">PhysicsEngine</span>
          </div>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-2 py-1 rounded-md bg-secondary">
              {data.meta.domain} · {data.meta.scenario}
            </span>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* SIDEBAR : énoncé */}
        {sidebarOpen && (
          <aside className="w-72 shrink-0 border-r border-border flex flex-col bg-sidebar">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Énoncé</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-4 space-y-3 flex-1 overflow-y-auto scrollbar-thin">
              <textarea
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                placeholder="Collez un exercice de physique..."
                rows={6}
                disabled={isLoading}
                className="w-full resize-none rounded-md bg-background border border-border px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition disabled:opacity-50 leading-relaxed"
              />
              <Button
                onClick={() => exercise.trim() && handleSubmit(exercise.trim())}
                disabled={isLoading || !exercise.trim()}
                className="w-full h-9"
                size="sm"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (<><span className="text-xs">Analyser</span><ArrowRight className="h-3.5 w-3.5 ml-1" /></>)}
              </Button>

              <div className="pt-3 border-t border-border space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Exemples</p>
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setExercise(ex); handleSubmit(ex); }}
                    disabled={isLoading}
                    className="w-full text-left text-[11px] px-2.5 py-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-secondary/50 transition leading-snug disabled:opacity-30"
                  >
                    {ex.length > 70 ? ex.slice(0, 70) + "…" : ex}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* CENTRE : schéma + animation + sliders */}
        <main className="flex-1 flex flex-col min-w-0 p-4 gap-3 overflow-hidden">
          {!data && !isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center">
                  <Atom className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Moteur de physique animé</h2>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    Entrez un exercice : le moteur calcule la géométrie exacte, dessine les forces, joue l'animation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Analyse en cours…
              </div>
            </div>
          )}

          {data && scene && !isLoading && (
            <>
              {/* Schéma */}
              <div className="flex-1 min-h-0 rounded-xl overflow-hidden scene-frame">
                <SceneRenderer scene={scene} step={step} />
              </div>

              {/* Player */}
              <AnimationPlayer
                duration={scene.duration ?? 3}
                t={t}
                onTimeChange={setT}
                phaseLabel={scene.phaseLabel}
              />

              {/* Sliders */}
              {Object.keys(constants).length > 0 && (
                <div className="rounded-lg border border-border bg-card px-4 py-3">
                  <ControlsPanel
                    constants={constants}
                    onConstantChange={(k, v) => setConstants((prev) => ({ ...prev, [k]: v }))}
                  />
                </div>
              )}
            </>
          )}
        </main>

        {/* DROITE : étapes */}
        {data && !isLoading && (
          <aside className="w-80 shrink-0 border-l border-border flex flex-col bg-sidebar">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Résolution</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                  disabled={currentStep <= 0}
                  className="h-6 w-6 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-mono text-muted-foreground tabular-nums px-1">
                  {currentStep + 1}/{totalSteps}
                </span>
                <button
                  onClick={() => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))}
                  disabled={currentStep >= totalSteps - 1}
                  className="h-6 w-6 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
              <StepsPanel
                steps={data.timeline}
                currentStep={currentStep}
                onStepClick={(i) => setCurrentStep(i)}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default Index;
