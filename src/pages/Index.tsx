import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Atom, Sparkles, Loader2, ArrowUp, Plus, MessageSquare, History as HistoryIcon, FileDown } from "lucide-react";
import SceneRenderer from "@/components/SceneRenderer";
import ControlsPanel from "@/components/ControlsPanel";
import AnimationPlayer from "@/components/AnimationPlayer";
import BlackboardOverlay from "@/components/BlackboardOverlay";
import ChatPanel, { type ChatMsg } from "@/components/ChatPanel";
import HistoryPanel, { type HistoryEntry } from "@/components/HistoryPanel";
import EditableStatement from "@/components/EditableStatement";
import { Button } from "@/components/ui/button";
import { parseExercise } from "@/lib/api";
import { computeLayout } from "@/lib/physics/layoutEngine";
import type { CognitiveJSON } from "@/types/cognitive";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  { label: "Chute libre", prompt: "Un objet de 2 kg est lâché sans vitesse initiale d'une hauteur de 20 m. Calculer le temps de chute et la vitesse à l'arrivée." },
  { label: "Plan incliné", prompt: "Un bloc de 5 kg glisse sur un plan incliné de 30° avec un coefficient de frottement μ=0.2. Déterminer l'accélération." },
  { label: "Plan + poulie", prompt: "Un bloc de 2 kg est placé sur un plan incliné de 30°. Il est relié par une corde passant sur une poulie idéale à une masse suspendue de 1 kg. Coefficient de frottement μ=0.2. Déterminer l'accélération du système et la tension dans la corde." },
  { label: "Projectile", prompt: "Un projectile est lancé à 20 m/s avec un angle de 45°. Calculer la portée et la hauteur maximale." },
  { label: "Poulie d'Atwood", prompt: "Deux masses 3 kg et 5 kg reliées par une corde sur une poulie. Calculer l'accélération." },
  { label: "Ressort", prompt: "Un ressort k=200 N/m est comprimé de 10 cm avec une masse de 1 kg. Calculer l'énergie potentielle." },
  { label: "Pendule", prompt: "Un pendule de longueur 1.5 m est lâché à 25°. Calculer la période." },
  { label: "Circuit RC", prompt: "Un circuit comporte une batterie de 12V en série avec une résistance de 100Ω et un condensateur de 10µF. Décrire le régime transitoire." },
];

const Logo: React.FC = () => (
  <div className="flex items-center gap-2">
    <div className="h-7 w-7 rounded-lg gradient-hero flex items-center justify-center shadow-soft">
      <Atom className="h-4 w-4 text-white" strokeWidth={2.5} />
    </div>
    <span className="text-[15px] font-bold tracking-tight">PhysicsEngine</span>
  </div>
);

interface HistoryItem extends HistoryEntry {
  exercise: string;
  data: CognitiveJSON;
}

const Index = () => {
  const { toast } = useToast();
  const [exercise, setExercise] = useState("");
  const [heroInput, setHeroInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<CognitiveJSON | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [constants, setConstants] = useState<Record<string, number>>({});
  const [t, setT] = useState(0);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | undefined>();
  const [rightTab, setRightTab] = useState<"chat" | "history">("chat");
  const stepClickInFlight = useRef(false);

  const pushHistory = useCallback((label: string, ex: string, d: CognitiveJSON) => {
    const id = `h-${Date.now()}`;
    setHistory((prev) => [...prev, { id, label, timestamp: Date.now(), exercise: ex, data: d }]);
    setCurrentHistoryId(id);
  }, []);

  const runParse = useCallback(async (text: string, opts: { isFirst?: boolean; chatPrompt?: string } = {}) => {
    setIsLoading(true);
    try {
      const result = await parseExercise(text);
      setData(result);
      setExercise(text);
      setConstants(result.constants ?? {});
      setCurrentStep(0);
      setT(0);
      const label = opts.isFirst
        ? "Énoncé initial"
        : opts.chatPrompt
          ? `Modification : ${opts.chatPrompt.slice(0, 60)}`
          : "Énoncé modifié";
      pushHistory(label, text, result);
      if (opts.chatPrompt) {
        setChatMessages((m) => [
          ...m,
          { id: `a-${Date.now()}`, role: "assistant", content: `Schéma mis à jour ✓ — ${result.timeline.length} étapes recalculées.` },
        ]);
      }
      toast({ title: "Schéma généré", description: `${result.timeline.length} étapes — ${result.meta.scenario}` });
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Impossible d'analyser", variant: "destructive" });
      if (opts.chatPrompt) {
        setChatMessages((m) => [...m, { id: `e-${Date.now()}`, role: "assistant", content: "Échec de la mise à jour. Réessayez." }]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast, pushHistory]);

  const handleHeroSubmit = useCallback((text: string) => {
    setChatMessages([]);
    setHistory([]);
    runParse(text, { isFirst: true });
  }, [runParse]);

  // Chat → fusionne avec l'énoncé existant et regénère
  const handleChatSend = useCallback(() => {
    const prompt = chatInput.trim();
    if (!prompt) return;
    setChatMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: prompt }]);
    setChatInput("");
    const merged = `${exercise}\n\nMODIFICATION DEMANDÉE: ${prompt}`;
    runParse(merged, { chatPrompt: prompt });
  }, [chatInput, exercise, runParse]);

  const handleStatementSave = useCallback((newText: string) => {
    runParse(newText);
  }, [runParse]);

  const handleRestoreHistory = useCallback((id: string) => {
    const item = history.find((h) => h.id === id);
    if (!item) return;
    setData(item.data);
    setExercise(item.exercise);
    setConstants(item.data.constants ?? {});
    setCurrentStep(0);
    setT(0);
    setCurrentHistoryId(id);
    toast({ title: "Version restaurée" });
  }, [history, toast]);

  const scene = useMemo(() => {
    if (!data) return null;
    try { return computeLayout({ ...data, constants }, t); }
    catch (e) { console.error("Layout error:", e); return null; }
  }, [data, constants, t]);

  useEffect(() => { setT(0); }, [data?.diagram?.scenario]);

  useEffect(() => {
    if (!syncEnabled || !data || !scene) return;
    if (stepClickInFlight.current) { stepClickInFlight.current = false; return; }
    const duration = scene.duration ?? 1;
    const ratio = duration > 0 ? t / duration : 0;
    let bestIdx = -1;
    data.timeline.forEach((s, i) => {
      if (typeof s.t_ratio === "number" && s.t_ratio <= ratio + 0.001) bestIdx = i;
    });
    if (bestIdx >= 0 && bestIdx !== currentStep) setCurrentStep(bestIdx);
  }, [t, scene, data, syncEnabled, currentStep]);

  const goToStep = useCallback((i: number) => {
    setCurrentStep(i);
    if (syncEnabled && data && scene) {
      const ratio = data.timeline[i]?.t_ratio;
      if (typeof ratio === "number") {
        stepClickInFlight.current = true;
        setT(Math.max(0, Math.min(scene.duration ?? 1, ratio * (scene.duration ?? 1))));
      }
    }
  }, [data, scene, syncEnabled]);

  const totalSteps = data?.timeline.length || 0;
  const step = data?.timeline[currentStep];

  const newSession = () => {
    setData(null); setExercise(""); setHeroInput(""); setCurrentStep(0); setT(0);
    setChatMessages([]); setHistory([]); setCurrentHistoryId(undefined);
  };

  // ===================== HERO =====================
  if (!data && !isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="h-14 px-6 flex items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-sm">
          <Logo />
          <div className="flex items-center gap-2">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition px-3 py-1.5">Exemples</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition px-3 py-1.5">Documentation</a>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center gradient-hero-soft px-6 py-20">
          <div className="max-w-3xl w-full mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              <Sparkles className="h-3 w-3" />
              <span>Propulsé par l'IA</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
                Résolvez n'importe quel<br />
                <span className="text-gradient">problème de physique</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Décrivez un exercice — obtenez un schéma animé exact et la résolution pas à pas.
              </p>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); if (heroInput.trim()) handleHeroSubmit(heroInput.trim()); }}
              className="bg-card rounded-3xl shadow-elevated border border-border/60 p-2 mt-10 text-left"
            >
              <textarea
                value={heroInput}
                onChange={(e) => setHeroInput(e.target.value)}
                placeholder="Décrivez votre exercice de physique..."
                rows={3}
                className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <button type="button" className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition" title="Ajouter">
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={!heroInput.trim()}
                  className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition shadow-soft"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </form>

            <div className="flex flex-wrap gap-2 justify-center pt-4">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => { setHeroInput(ex.prompt); handleHeroSubmit(ex.prompt); }}
                  className="px-3.5 py-1.5 text-sm bg-card border border-border rounded-full text-foreground/80 hover:text-foreground hover:border-foreground/40 hover:shadow-soft transition-all"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ===================== LOADING (initial) =====================
  if (isLoading && !data) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="h-14 px-6 flex items-center justify-between border-b border-border/60">
          <Logo />
        </header>
        <div className="flex-1 flex items-center justify-center gradient-hero-soft">
          <div className="flex items-center gap-3 text-base text-foreground/70">
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyse de l'énoncé…
          </div>
        </div>
      </div>
    );
  }

  // ===================== WORKSPACE =====================
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-14 shrink-0 px-6 flex items-center justify-between border-b border-border/60 bg-background">
        <div className="flex items-center gap-4">
          <Logo />
          {data && (
            <span className="text-[11px] font-medium text-muted-foreground px-2.5 py-1 rounded-full bg-secondary">
              {data.meta.domain} · {data.meta.scenario}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full h-8 px-3 text-xs" disabled title="Bientôt disponible">
            <FileDown className="h-3.5 w-3.5 mr-1" /> Exporter PDF
          </Button>
          <Button onClick={newSession} variant="default" size="sm" className="rounded-full h-8 px-4 text-xs font-medium">
            <Plus className="h-3.5 w-3.5 mr-1" /> Nouvel exercice
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar gauche : énoncé éditable + chat contextuel */}
        <aside className="w-[340px] shrink-0 border-r border-border/60 flex flex-col bg-sidebar">
          <div className="px-5 py-3 border-b border-border/60 flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Énoncé</span>
          </div>
          <div className="px-4 pt-3 pb-2 border-b border-border/60">
            <EditableStatement text={exercise} onSave={handleStatementSave} disabled={isLoading} />
            <div className="text-[11px] text-muted-foreground px-1 pt-2">
              {totalSteps} étapes · {data?.meta.scenario}
            </div>
          </div>
          <ChatPanel
            messages={chatMessages}
            input={chatInput}
            onInputChange={setChatInput}
            onSend={handleChatSend}
            isLoading={isLoading}
          />
        </aside>

        {/* TABLEAU central — étendu */}
        <main className="flex-1 flex flex-col min-w-0 p-6 gap-4 overflow-hidden bg-background">
          {data && scene && (
            <>
              <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden scene-frame">
                <SceneRenderer scene={scene} step={step} />
                <BlackboardOverlay step={step} index={currentStep} />
              </div>

              <div className="rounded-2xl bg-card border border-border/60 shadow-soft">
                <AnimationPlayer
                  duration={scene.duration ?? 3}
                  t={t}
                  onTimeChange={(newT) => { stepClickInFlight.current = false; setT(newT); }}
                  phaseLabel={scene.phaseLabel}
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  onPrevStep={() => goToStep(Math.max(0, currentStep - 1))}
                  onNextStep={() => goToStep(Math.min(totalSteps - 1, currentStep + 1))}
                  syncEnabled={syncEnabled}
                  onToggleSync={() => setSyncEnabled((s) => !s)}
                />
              </div>

              {Object.keys(constants).length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-soft">
                  <ControlsPanel
                    constants={constants}
                    onConstantChange={(k, v) => setConstants((prev) => ({ ...prev, [k]: v }))}
                  />
                </div>
              )}
            </>
          )}
        </main>

        {/* Sidebar droite : Historique */}
        <aside className="w-72 shrink-0 border-l border-border/60 flex flex-col bg-sidebar">
          <div className="px-5 py-3 border-b border-border/60 flex items-center gap-2">
            <HistoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historique</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{history.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <HistoryPanel
              entries={history.map(({ id, label, timestamp }) => ({ id, label, timestamp }))}
              currentId={currentHistoryId}
              onRestore={handleRestoreHistory}
            />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Index;
