import React from "react";
import { X, Keyboard } from "lucide-react";

interface Props { open: boolean; onClose: () => void; }

const SHORTCUTS: Array<{ keys: string[]; label: string; group: string }> = [
  { group: "Lecture", keys: ["Espace"], label: "Lecture / Pause" },
  { group: "Lecture", keys: ["R"], label: "Réinitialiser le temps" },
  { group: "Lecture", keys: ["L"], label: "Activer / désactiver la boucle" },
  { group: "Étapes", keys: ["←"], label: "Étape précédente" },
  { group: "Étapes", keys: ["→"], label: "Étape suivante" },
  { group: "Étapes", keys: ["S"], label: "Sync étapes ↔ temps" },
  { group: "Affichage", keys: ["F"], label: "Afficher / masquer les forces" },
  { group: "Affichage", keys: ["+"], label: "Zoom avant" },
  { group: "Affichage", keys: ["-"], label: "Zoom arrière" },
  { group: "Affichage", keys: ["0"], label: "Zoom 100%" },
  { group: "Panneaux", keys: ["P"], label: "Paramètres en temps réel" },
  { group: "Panneaux", keys: ["C"], label: "Chat & énoncé" },
  { group: "Panneaux", keys: ["H"], label: "Historique" },
  { group: "Panneaux", keys: ["Échap"], label: "Fermer le panneau actif" },
  { group: "Divers", keys: ["?"], label: "Afficher cette aide" },
];

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-1.5 h-5 min-w-5 inline-flex items-center justify-center rounded border border-border bg-secondary text-[10px] font-mono text-foreground/80 shadow-sm">
    {children}
  </kbd>
);

const ShortcutsOverlay: React.FC<Props> = ({ open, onClose }) => {
  if (!open) return null;
  const groups = Array.from(new Set(SHORTCUTS.map((s) => s.group)));
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl shadow-elevated w-[min(560px,92vw)] max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="h-12 px-4 border-b border-border flex items-center gap-2 shrink-0">
          <Keyboard className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Raccourcis clavier
          </span>
          <button
            onClick={onClose}
            className="ml-auto h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mb-2 font-mono">
                {g}
              </div>
              <div className="space-y-1">
                {SHORTCUTS.filter((s) => s.group === g).map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary/60"
                  >
                    <span className="text-sm text-foreground/90">{s.label}</span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShortcutsOverlay;
