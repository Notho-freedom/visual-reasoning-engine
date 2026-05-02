import React from "react";
import { cn } from "@/lib/utils";
import { Clock, RotateCw } from "lucide-react";

export interface HistoryEntry {
  id: string;
  label: string;
  timestamp: number;
}

interface Props {
  entries: HistoryEntry[];
  currentId?: string;
  onRestore: (id: string) => void;
}

const formatTime = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const HistoryPanel: React.FC<Props> = ({ entries, currentId, onRestore }) => {
  if (entries.length === 0) {
    return (
      <div className="px-4 py-6 text-xs text-muted-foreground text-center">
        Aucune version pour l'instant.
      </div>
    );
  }
  return (
    <div className="px-3 py-3 space-y-1.5">
      {entries.map((e, i) => {
        const active = e.id === currentId;
        return (
          <button
            key={e.id}
            onClick={() => onRestore(e.id)}
            className={cn(
              "w-full text-left rounded-xl px-3 py-2.5 border transition-all flex items-start gap-2.5",
              active
                ? "border-foreground bg-card shadow-soft"
                : "border-border bg-card hover:border-foreground/40"
            )}
          >
            <div className="mt-0.5 text-muted-foreground">
              {active ? <RotateCw className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground line-clamp-2">{e.label}</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                v{i + 1} · {formatTime(e.timestamp)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default HistoryPanel;
