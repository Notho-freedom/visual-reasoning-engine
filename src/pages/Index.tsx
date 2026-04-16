import React, { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Atom } from "lucide-react";
import ExerciseInput from "@/components/ExerciseInput";
import SceneRenderer from "@/components/SceneRenderer";
import StepsPanel from "@/components/StepsPanel";
import ControlsPanel from "@/components/ControlsPanel";
import { parseExercise } from "@/lib/api";
import type { CognitiveJSON } from "@/types/cognitive";

const Index = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<CognitiveJSON | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [constants, setConstants] = useState<Record<string, number>>({});

  const handleSubmit = useCallback(async (exercise: string) => {
    setIsLoading(true);
    setData(null);
    setCurrentStep(0);

    try {
      const result = await parseExercise(exercise);
      setData(result);
      setConstants(result.constants ?? {});

      toast({
        title: "Analyse terminée",
        description: `${result.timeline.length} étapes identifiées — ${result.meta.scenario}`,
      });
    } catch (err: any) {
      toast({
        title: "Erreur d'analyse",
        description: err.message || "Impossible d'analyser l'exercice",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const totalSteps = data?.timeline.length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 h-12 flex items-center">
        <div className="max-w-screen-xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Atom className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-foreground tracking-tight">
              PhysicsEngine
            </span>
          </div>
          {data && (
            <span className="text-xs font-mono text-muted-foreground">
              {data.meta.domain} / {data.meta.scenario}
            </span>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-screen-xl mx-auto px-6 py-6">
        {/* Input */}
        <ExerciseInput onSubmit={handleSubmit} isLoading={isLoading} />

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Analyse en cours...
            </div>
          </div>
        )}

        {/* Results */}
        {data && !isLoading && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            {/* Canvas + controls */}
            <div className="space-y-4">
              <div className="rounded-lg border border-border overflow-hidden glass-card">
                <SceneRenderer data={data} currentStep={currentStep} />
              </div>
              <ControlsPanel
                constants={constants}
                onConstantChange={(k, v) =>
                  setConstants((prev) => ({ ...prev, [k]: v }))
                }
                currentStep={currentStep}
                totalSteps={totalSteps}
                onPrev={() => setCurrentStep((s) => Math.max(0, s - 1))}
                onNext={() => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))}
                onReset={() => setCurrentStep(0)}
              />
            </div>

            {/* Steps sidebar */}
            <div className="rounded-lg border border-border p-4 glass-card max-h-[600px] overflow-y-auto">
              <StepsPanel
                steps={data.timeline}
                currentStep={currentStep}
                onStepClick={(i) => setCurrentStep(i)}
              />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!data && !isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3 max-w-sm">
              <Atom className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <h2 className="text-base font-medium text-foreground">
                Entrez un exercice de physique
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Mécanique, électricité, optique — le moteur analyse l'énoncé et construit un schéma interactif avec résolution pas à pas.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
