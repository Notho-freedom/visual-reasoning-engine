import React from "react";
import { Loader2, Check, AlertCircle, Clock, X } from "lucide-react";
import type { QueuedExercise } from "@/hooks/useExerciseQueue";
import { cn } from "@/lib/utils";

interface Props {
  exercises: QueuedExercise[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const StatusIcon: React.FC<{ status: QueuedExercise["status"] }> = ({ status }) => {
  switch (status) {
    case "pending": return <Clock className="h-3 w-3 opacity-50" />;
    case "parsing": return <Loader2 className="h-3 w-3 animate-spin" />;
    case "ready": return <Check className="h-3 w-3 text-emerald-600" />;
    case "error": return <AlertCircle className="h-3 w-3 text-destructive" />;
  }
};

const ExerciseTabs: React.FC<Props> = ({ exercises, activeId, onSelect, onClose }) => {
  if (exercises.length === 0) return null;
  return (
    <div className="shrink-0 flex items-center gap-1 px-4 h-10 border-b border-border/60 bg-card/40 overflow-x-auto scrollbar-thin">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-mono mr-2 shrink-0">
        Sujet · {exercises.length} ex.
      </span>
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {exercises.map((e, i) => (
          <button
            key={e.id}
            onClick={() => onSelect(e.id)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs border transition-all",
              activeId === e.id
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-foreground/70 border-border hover:border-foreground/40 hover:text-foreground"
            )}
            title={e.statement.slice(0, 120) + "…"}
          >
            <StatusIcon status={e.status} />
            <span className="font-medium">{e.title || `Ex ${i + 1}`}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
        title="Fermer le sujet"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default ExerciseTabs;
