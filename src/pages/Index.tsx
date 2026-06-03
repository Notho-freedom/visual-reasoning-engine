import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Atom, Sparkles, Loader2, ArrowUp, Plus, MessageSquare,
  History as HistoryIcon, FileDown, X, FolderOpen, Trash2,
} from "lucide-react";
import SceneRenderer from "@/components/SceneRenderer";
import AnimationPlayer from "@/components/AnimationPlayer";
import BlackboardOverlay from "@/components/BlackboardOverlay";
import ChatPanel, { type ChatMsg } from "@/components/ChatPanel";
import HistoryPanel, { type HistoryEntry } from "@/components/HistoryPanel";
import EditableStatement from "@/components/EditableStatement";
import ParamsOverlay from "@/components/ParamsOverlay";
import ShortcutsOverlay from "@/components/ShortcutsOverlay";
import ExerciseTabs from "@/components/ExerciseTabs";
import UploadButton from "@/components/UploadButton";
import CommunityGallery from "@/components/CommunityGallery";
import { useExerciseQueue } from "@/hooks/useExerciseQueue";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { parseExercise, type ExtractedExercise } from "@/lib/api";
import { computeLayout } from "@/lib/physics/layoutEngine";
import type { CognitiveJSON } from "@/types/cognitive";
import {
  loadCurrent, debouncedSave, archiveCurrent, listSessions, loadSession,
  deleteSession, clearCurrent, type SessionMeta, type HistoryItemSerial,
} from "@/lib/persistence";

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

interface HistoryItem extends HistoryEntry { exercise: string; data: CognitiveJSON; }

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

  // UI overlay state
  const [chatOpen, setChatOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [showForces, setShowForces] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [sessions, setSessions] = useState<SessionMeta[]>(() => listSessions());
  const playRef = useRef<{ toggle: () => void; reset: () => void } | null>(null);

  const stepClickInFlight = useRef(false);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);
  const initialConstantsRef = useRef<Record<string, number>>({});

  // File d'exercices extraits d'un document uploadé
  const queue = useExerciseQueue();

  // Quand on clique un onglet, charger ses données dans la vue principale
  useEffect(() => {
    if (!queue.activeId) return;
    const ex = queue.exercises.find(e => e.id === queue.activeId);
    if (!ex) return;
    if (ex.status === "ready" && ex.data) {
      setData(ex.data);
      setExercise(ex.statement);
      setConstants(ex.data.constants ?? {});
      initialConstantsRef.current = { ...(ex.data.constants ?? {}) };
      setCurrentStep(0); setT(0);
    } else if (ex.status === "parsing" || ex.status === "pending") {
      // garder le précédent affichage; les onglets montrent l'état
    }
  }, [queue.activeId, queue.exercises]);

  const handleExtracted = useCallback((items: ExtractedExercise[]) => {
    setChatMessages([]); setHistory([]);
    queue.setQueue(items.map(it => ({ title: it.title, statement: it.statement })));
  }, [queue]);


  // Restore session on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const s = loadCurrent();
    if (s && s.data) {
      setData(s.data); setExercise(s.exercise); setConstants(s.constants ?? {});
      initialConstantsRef.current = { ...(s.data.constants ?? {}) };
      setT(s.t ?? 0); setCurrentStep(s.currentStep ?? 0);
      setChatMessages(s.chatMessages ?? []);
      setHistory((s.history ?? []) as HistoryItem[]);
      setCurrentHistoryId(s.currentHistoryId);
    }
  }, []);

  // Persist on changes
  useEffect(() => {
    if (!data) return;
    debouncedSave({ exercise, data, constants, t, currentStep, chatMessages, history: history as HistoryItemSerial[], currentHistoryId });
  }, [exercise, data, constants, t, currentStep, chatMessages, history, currentHistoryId]);

  // Keyboard shortcuts (only when workspace is active) — defined after goToStep below


  const pushHistory = useCallback((label: string, ex: string, d: CognitiveJSON) => {
    const id = `h-${Date.now()}`;
    setHistory((prev) => [...prev, { id, label, timestamp: Date.now(), exercise: ex, data: d }]);
    setCurrentHistoryId(id);
  }, []);

  const runParse = useCallback(async (
    text: string,
    opts: { isFirst?: boolean; chatPrompt?: string } = {}
  ) => {
    setIsLoading(true);
    try {
      const previous = opts.chatPrompt ? data : null;
      const result = await parseExercise(text, previous, opts.chatPrompt);
      setData(result);
      setExercise(text);
      setConstants(result.constants ?? {});
      initialConstantsRef.current = { ...(result.constants ?? {}) };
      setCurrentStep(0);
      setT(0);
      const label = opts.isFirst
        ? "Énoncé initial"
        : opts.chatPrompt
          ? `Modif : ${opts.chatPrompt.slice(0, 60)}`
          : "Énoncé modifié";
      pushHistory(label, text, result);
      if (opts.chatPrompt) {
        const diff = previous
          ? `Schéma mis à jour ✓ — ${previous.diagram.objects.length}→${result.diagram.objects.length} objets, ${result.timeline.length} étapes (${result.meta.scenario}).`
          : `Schéma mis à jour ✓ — ${result.timeline.length} étapes.`;
        setChatMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: diff }]);
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
  }, [toast, pushHistory, data]);

  const handleHeroSubmit = useCallback((text: string) => {
    setChatMessages([]); setHistory([]);
    runParse(text, { isFirst: true });
  }, [runParse]);

  const handleChatSend = useCallback(() => {
    const prompt = chatInput.trim();
    if (!prompt) return;
    setChatMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: prompt }]);
    setChatInput("");
    runParse(exercise, { chatPrompt: prompt });
  }, [chatInput, exercise, runParse]);

  const handleStatementSave = useCallback((newText: string) => { runParse(newText); }, [runParse]);

  const handleRestoreHistory = useCallback((id: string) => {
    const item = history.find((h) => h.id === id);
    if (!item) return;
    setData(item.data); setExercise(item.exercise);
    setConstants(item.data.constants ?? {});
    initialConstantsRef.current = { ...(item.data.constants ?? {}) };
    setCurrentStep(0); setT(0); setCurrentHistoryId(id);
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

  useKeyboardShortcuts({
    enabled: !!data,
    onPlayToggle: () => playRef.current?.toggle(),
    onReset: () => playRef.current?.reset(),
    onLoopToggle: () => setLoopEnabled(l => !l),
    onPrevStep: () => goToStep(Math.max(0, currentStep - 1)),
    onNextStep: () => goToStep(Math.min((data?.timeline.length ?? 1) - 1, currentStep + 1)),
    onSyncToggle: () => setSyncEnabled(s => !s),
    onForcesToggle: () => setShowForces(s => !s),
    onZoomIn: () => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2))),
    onZoomOut: () => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2))),
    onZoomReset: () => setZoom(1),
    onToggleParams: () => setParamsOpen(o => !o),
    onToggleChat: () => { setChatOpen(o => !o); setHistoryOpen(false); },
    onToggleHistory: () => { setHistoryOpen(o => !o); setChatOpen(false); },
    onShowHelp: () => setHelpOpen(true),
    onEscape: () => { setChatOpen(false); setHistoryOpen(false); setHelpOpen(false); setParamsOpen(false); },
  });

  const totalSteps = data?.timeline.length || 0;
  const step = data?.timeline[currentStep];

  const newSession = () => {
    // Archive then reset
    if (data) {
      archiveCurrent({
        exercise, data, constants, t, currentStep, chatMessages,
        history: history as HistoryItemSerial[], currentHistoryId, updatedAt: Date.now(),
      });
      setSessions(listSessions());
    }
    clearCurrent();
    setData(null); setExercise(""); setHeroInput(""); setCurrentStep(0); setT(0);
    setChatMessages([]); setHistory([]); setCurrentHistoryId(undefined);
    setChatOpen(false); setHistoryOpen(false);
  };

  const handleLoadSession = (id: string) => {
    const s = loadSession(id);
    if (!s || !s.data) return;
    setData(s.data); setExercise(s.exercise); setConstants(s.constants ?? {});
    initialConstantsRef.current = { ...(s.data.constants ?? {}) };
    setT(s.t ?? 0); setCurrentStep(s.currentStep ?? 0);
    setChatMessages(s.chatMessages ?? []);
    setHistory((s.history ?? []) as HistoryItem[]);
    setCurrentHistoryId(s.currentHistoryId);
    toast({ title: "Session chargée" });
  };
  const handleDeleteSession = (id: string) => {
    deleteSession(id); setSessions(listSessions());
  };

  // Toolbar handlers
  const handleFullscreen = () => {
    const el = boardContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };
  const handleScreenshot = () => {
    const svg = boardContainerRef.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `physics-${Date.now()}.svg`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Capture exportée" });
  };
  const handleCopyStep = () => {
    if (!step) return;
    const lines = [
      `# Étape ${currentStep + 1} : ${step.title}`,
      step.formula && `\\[ ${step.formula} \\]`,
      step.description,
      step.result && Object.entries(step.result).map(([k, v]) => `- ${k} = ${v}`).join("\n"),
    ].filter(Boolean).join("\n\n");
    navigator.clipboard?.writeText(lines);
  };

  // ===================== HERO =====================
  if (!data && !isLoading && queue.exercises.length === 0) {
    const hasSessions = sessions.length > 0;
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="h-14 px-6 flex items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-sm">
          <Logo />
          <div className="flex items-center gap-2">
            {hasSessions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full h-8 px-3 text-xs">
                    <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                    Reprendre ({sessions.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="text-xs">Sessions sauvegardées</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {sessions.map((s) => (
                    <div key={s.id} className="flex items-start gap-1 px-1">
                      <DropdownMenuItem className="flex-1 cursor-pointer" onClick={() => handleLoadSession(s.id)}>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{s.title}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{s.preview}</div>
                        </div>
                      </DropdownMenuItem>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                        className="h-7 w-7 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center"
                      ><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
                <UploadButton onExtracted={handleExtracted} />
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
          <CommunityGallery onPick={(p) => { setHeroInput(p); handleHeroSubmit(p); }} />
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
    <TooltipProvider delayDuration={200}>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <header className="h-14 shrink-0 px-6 flex items-center justify-between border-b border-border/60 bg-background z-30">
          <div className="flex items-center gap-4">
            <Logo />
            {data && (
              <span className="text-[11px] font-medium text-muted-foreground px-2.5 py-1 rounded-full bg-secondary">
                {data.meta.domain} · {data.meta.scenario}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setChatOpen(o => !o); setHistoryOpen(false); }}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition ${
                    chatOpen ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-foreground hover:bg-secondary"
                  }`}
                  aria-label="Chat"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">Chat & énoncé</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setHistoryOpen(o => !o); setChatOpen(false); }}
                  className={`relative h-8 w-8 rounded-full flex items-center justify-center transition ${
                    historyOpen ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-foreground hover:bg-secondary"
                  }`}
                  aria-label="Historique"
                >
                  <HistoryIcon className="h-4 w-4" />
                  {history.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-foreground text-background text-[9px] font-mono flex items-center justify-center">
                      {history.length}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">Historique des versions</TooltipContent>
            </Tooltip>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="outline" size="sm" className="rounded-full h-8 px-3 text-xs" disabled title="Bientôt disponible">
              <FileDown className="h-3.5 w-3.5 mr-1" /> Exporter PDF
            </Button>
            <Button onClick={newSession} variant="default" size="sm" className="rounded-full h-8 px-4 text-xs font-medium">
              <Plus className="h-3.5 w-3.5 mr-1" /> Nouvel exercice
            </Button>
          </div>
        </header>

        {queue.exercises.length > 0 && (
          <ExerciseTabs
            exercises={queue.exercises}
            activeId={queue.activeId}
            onSelect={queue.setActiveId}
            onClose={() => { queue.reset(); newSession(); }}
          />
        )}

        <div className="flex-1 flex min-h-0 relative">
          {/* TABLEAU plein écran + toolbar */}
          <main className="flex-1 flex flex-col min-w-0 p-6 gap-3 overflow-hidden bg-background">
            {!data && queue.exercises.length > 0 && (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground gap-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse de l'exercice sélectionné…
              </div>
            )}
            {data && scene && (
              <>
                <div
                  ref={boardContainerRef}
                  className="relative flex-1 min-h-0 rounded-2xl overflow-hidden scene-frame"
                >
                  <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                    {/* Zone EXPLICATIONS (gauche) */}
                    <ResizablePanel defaultSize={40} minSize={20} maxSize={70} className="relative bg-card">
                      <div className="absolute top-3 left-4 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-mono pointer-events-none z-10">
                        Résolution
                      </div>
                      <BlackboardOverlay step={step} index={currentStep} data={data} constants={constants} resetKey={data.meta.title + (history[0]?.id ?? "")} />
                    </ResizablePanel>

                    <ResizableHandle className="w-px bg-border/60 hover:bg-primary/40 hover:w-[2px] transition-all data-[resize-handle-state=drag]:bg-primary/60 data-[resize-handle-state=drag]:w-[2px]" />

                    {/* Zone SCHÉMA (droite) */}
                    <ResizablePanel defaultSize={60} minSize={30} className="relative bg-card overflow-hidden">
                      <div className="absolute top-3 right-4 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-mono pointer-events-none z-10">
                        Schéma
                      </div>
                      <div
                        className="absolute inset-0 origin-center"
                        style={{ transform: `scale(${zoom})`, transition: "transform 200ms ease" }}
                      >
                        <SceneRenderer scene={scene} step={step} showForces={showForces} zoom={zoom} />
                      </div>
                      <ParamsOverlay
                        open={paramsOpen}
                        onClose={() => setParamsOpen(false)}
                        constants={constants}
                        initialConstants={initialConstantsRef.current}
                        onChange={(k, v) => setConstants((prev) => ({ ...prev, [k]: v }))}
                        onReset={() => setConstants({ ...initialConstantsRef.current })}
                      />
                    </ResizablePanel>
                  </ResizablePanelGroup>
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
                    onFullscreen={handleFullscreen}
                    onScreenshot={handleScreenshot}
                    showForces={showForces}
                    onToggleForces={() => setShowForces(s => !s)}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    onCopyStep={handleCopyStep}
                    paramsOpen={paramsOpen}
                    onToggleParams={() => setParamsOpen(o => !o)}
                    paramsCount={Object.keys(constants).length}
                    loopEnabled={loopEnabled}
                    onToggleLoop={() => setLoopEnabled(l => !l)}
                    onShowHelp={() => setHelpOpen(true)}
                    playRef={playRef}
                  />
                </div>
              </>
            )}
          </main>
          <ShortcutsOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />

          {/* Overlay panel : Chat (gauche) */}
          {chatOpen && (
            <>
              <div className="absolute inset-0 z-10 bg-foreground/5" onClick={() => setChatOpen(false)} />
              <aside className="absolute top-0 left-0 bottom-0 w-[380px] z-20 bg-sidebar border-r border-border/60 shadow-elevated flex flex-col animate-slide-in-right" style={{ animationDirection: "reverse" }}>
                <div className="px-5 h-12 shrink-0 border-b border-border/60 flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Énoncé & Chat</span>
                  <button onClick={() => setChatOpen(false)} className="ml-auto h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
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
            </>
          )}

          {/* Overlay panel : Historique (droite) */}
          {historyOpen && (
            <>
              <div className="absolute inset-0 z-10 bg-foreground/5" onClick={() => setHistoryOpen(false)} />
              <aside className="absolute top-0 right-0 bottom-0 w-72 z-20 bg-sidebar border-l border-border/60 shadow-elevated flex flex-col animate-slide-in-right">
                <div className="px-5 h-12 shrink-0 border-b border-border/60 flex items-center gap-2">
                  <HistoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historique</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{history.length}</span>
                  <button onClick={() => setHistoryOpen(false)} className="ml-auto h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                  <HistoryPanel
                    entries={history.map(({ id, label, timestamp }) => ({ id, label, timestamp }))}
                    currentId={currentHistoryId}
                    onRestore={handleRestoreHistory}
                  />
                </div>
                {sessions.length > 0 && (
                  <div className="border-t border-border/60 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">Sessions sauvegardées</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
                      {sessions.map((s) => (
                        <div key={s.id} className="flex items-center gap-1">
                          <button
                            onClick={() => handleLoadSession(s.id)}
                            className="flex-1 text-left rounded-lg px-2 py-1.5 hover:bg-secondary text-xs truncate"
                            title={s.preview}
                          >{s.title}</button>
                          <button
                            onClick={() => handleDeleteSession(s.id)}
                            className="h-7 w-7 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center"
                          ><Trash2 className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Index;
