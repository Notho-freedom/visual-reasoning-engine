import React, { useState, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";

interface Props {
  text: string;
  onSave: (text: string) => void;
  disabled?: boolean;
}

const EditableStatement: React.FC<Props> = ({ text, onSave, disabled }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  useEffect(() => { setDraft(text); }, [text]);

  if (editing) {
    return (
      <div className="rounded-2xl bg-card border border-foreground/30 shadow-soft p-2.5">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground focus:outline-none"
        />
        <div className="flex justify-end gap-1 pt-1">
          <button
            onClick={() => { setDraft(text); setEditing(false); }}
            className="h-7 px-2 rounded-full text-xs text-muted-foreground hover:bg-secondary flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Annuler
          </button>
          <button
            disabled={!draft.trim() || draft.trim() === text.trim() || disabled}
            onClick={() => { onSave(draft.trim()); setEditing(false); }}
            className="h-7 px-3 rounded-full text-xs bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1 disabled:opacity-30"
          >
            <Check className="h-3 w-3" /> Régénérer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative rounded-2xl bg-card border border-border/60 shadow-soft px-4 py-3">
      <p className="text-sm leading-relaxed text-foreground pr-8">{text || "—"}</p>
      <button
        onClick={() => setEditing(true)}
        disabled={disabled}
        className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 hover:bg-secondary flex items-center justify-center text-muted-foreground transition disabled:opacity-30"
        title="Modifier l'énoncé"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
};

export default EditableStatement;
