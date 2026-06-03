import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateExercise } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DIFFICULTIES: { id: "facile" | "moyen" | "difficile"; label: string }[] = [
  { id: "facile", label: "Facile" },
  { id: "moyen", label: "Moyen" },
  { id: "difficile", label: "Difficile" },
];

const RANDOM = "__random__";
const SCENARIOS = [
  { id: RANDOM, label: "Aléatoire" },
  { id: "freeFall", label: "Chute libre" },
  { id: "inclinedPlane", label: "Plan incliné" },
  { id: "inclinedPulley", label: "Plan + poulie" },
  { id: "projectile", label: "Projectile" },
  { id: "spring", label: "Ressort" },
  { id: "pendulum", label: "Pendule" },
  { id: "pulley", label: "Poulie d'Atwood" },
  { id: "circuit", label: "Circuit RC" },
];

interface Props {
  onGenerated: (statement: string) => void;
  disabled?: boolean;
}

const GenerateExerciseButton: React.FC<Props> = ({ onGenerated, disabled }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<"facile" | "moyen" | "difficile">("moyen");
  const [scenario, setScenario] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateExercise({ difficulty, scenario: scenario || undefined });
      onGenerated(res.statement);
      setOpen(false);
      toast({
        title: "Exercice généré",
        description: `${res.scenarioLabel} · ${difficulty}`,
      });
    } catch (e) {
      toast({
        title: "Échec",
        description: e instanceof Error ? e.message : "Impossible de générer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-secondary transition disabled:opacity-40"
          title="Générer un exercice par IA"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Générer
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-72 p-4 space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1.5">
            Difficulté
          </div>
          <div className="flex gap-1">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={cn(
                  "flex-1 h-8 rounded-full text-xs font-medium transition border",
                  difficulty === d.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-foreground/70 border-border hover:border-foreground/40"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1.5">
            Thème
          </div>
          <Select value={scenario} onValueChange={setScenario}>
            <SelectTrigger className="h-9 rounded-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCENARIOS.map((s) => (
                <SelectItem key={s.id || "random"} value={s.id} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full h-9 rounded-full bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Génération…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Générer un exercice
            </>
          )}
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default GenerateExerciseButton;
