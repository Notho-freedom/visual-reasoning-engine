import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ExerciseInputProps {
  onSubmit: (exercise: string) => void;
  isLoading: boolean;
}

const EXAMPLES = [
  "Un objet est lâché depuis 20m de hauteur",
  "Une balle tombe d'une tour de 50m",
  "Un caillou est lâché d'un pont à 30m du sol",
];

const ExerciseInput: React.FC<ExerciseInputProps> = ({ onSubmit, isLoading }) => {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Décris un exercice de physique..."
          className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={!value.trim() || isLoading}
          className="glow-cyan whitespace-nowrap"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⚙️</span> Analyse...
            </span>
          ) : (
            "🧠 Analyser"
          )}
        </Button>
      </form>

      <div className="flex gap-2 flex-wrap">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setValue(ex);
              onSubmit(ex);
            }}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all disabled:opacity-40"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExerciseInput;
