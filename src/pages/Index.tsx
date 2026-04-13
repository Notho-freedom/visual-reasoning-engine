import React, { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import ExerciseInput from "@/components/ExerciseInput";
import PhysicsCanvas from "@/components/PhysicsCanvas";
import StepsPanel from "@/components/StepsPanel";
import ControlsPanel from "@/components/ControlsPanel";
import { parseExercise } from "@/lib/api";
import type { CognitiveJSON } from "@/types/cognitive";

const Index = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<CognitiveJSON | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [height, setHeight] = useState(20);
  const [gravity, setGravity] = useState(9.81);

  const handleSubmit = useCallback(async (exercise: string) => {
    setIsLoading(true);
    setData(null);
    setCurrentStep(0);
    setIsPlaying(false);

    try {
      const result = await parseExercise(exercise);
      setData(result);

      // Extract initial height from entities if available
      const entity = result.entities?.[0];
      if (entity?.initial_position) {
        setHeight(entity.initial_position);
      }
      if (result.constants?.g) {
        setGravity(result.constants.g);
      }

      toast({
        title: "✅ Analyse terminée",
        description: `${result.timeline.length} étapes identifiées`,
      });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'analyser l'exercice",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const totalSteps = data?.timeline.length || 0;

  return (
    <div className="min-h-screen bg-background grid-bg">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <h1 className="text-lg font-bold text-foreground text-glow-cyan">
                PhysicsEngine
              </h1>
              <p className="text-xs text-muted-foreground">
                Moteur cognitif d'apprentissage
              </p>
            </div>
          </div>
          {data && (
            <div className="text-xs font-mono text-muted-foreground">
              {data.meta.scenario} • {totalSteps} étapes
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Input */}
        <ExerciseInput onSubmit={handleSubmit} isLoading={isLoading} />

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <div className="text-4xl animate-pulse-glow">🧠</div>
              <p className="text-sm text-muted-foreground">
                Le moteur cognitif analyse l'exercice...
              </p>
            </div>
          </div>
        )}

        {/* Visualization + Steps */}
        {data && !isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Canvas */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <PhysicsCanvas
                  data={data}
                  currentStep={currentStep}
                  isPlaying={isPlaying}
                  height={height}
                  gravity={gravity}
                />
              </div>
              <ControlsPanel
                height={height}
                gravity={gravity}
                onHeightChange={setHeight}
                onGravityChange={setGravity}
                currentStep={currentStep}
                totalSteps={totalSteps}
                isPlaying={isPlaying}
                onPrev={() => {
                  setCurrentStep((s) => Math.max(0, s - 1));
                  setIsPlaying(false);
                }}
                onNext={() => {
                  setCurrentStep((s) => Math.min(totalSteps - 1, s + 1));
                  setIsPlaying(false);
                }}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                onReset={() => {
                  setCurrentStep(0);
                  setIsPlaying(false);
                }}
              />
            </div>

            {/* Steps sidebar */}
            <div className="lg:col-span-1">
              <StepsPanel
                steps={data.timeline}
                currentStep={currentStep}
                onStepClick={(i) => {
                  setCurrentStep(i);
                  setIsPlaying(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!data && !isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-6xl">⚡</div>
              <h2 className="text-xl font-semibold text-foreground">
                Prêt à explorer la physique
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Entre un exercice de chute libre ci-dessus, et le moteur cognitif
                va le décomposer en étapes interactives avec une visualisation en temps réel.
              </p>
              <div className="flex items-center justify-center gap-6 pt-2 text-xs text-muted-foreground">
                <span>🎯 Pas à pas</span>
                <span>🎮 Interactif</span>
                <span>🧠 IA intégrée</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
