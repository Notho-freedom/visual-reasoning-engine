import React, { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExerciseInputProps {
  onSubmit: (exercise: string) => void;
  isLoading: boolean;
}

const EXAMPLES = [
  "Un objet de 2kg est lâché sans vitesse initiale depuis une hauteur de 20m. Calculer le temps de chute et la vitesse à l'arrivée.",
  "Un bloc de 5kg glisse sur un plan incliné de 30° avec un coefficient de frottement μ = 0.2. Déterminer l'accélération.",
  "Un projectile est lancé avec une vitesse de 20 m/s à un angle de 45°. Calculer la portée et la hauteur maximale.",
  "Deux masses de 3kg et 5kg sont reliées par une corde passant par une poulie. Calculer l'accélération du système.",
  "Un ressort de constante k=200 N/m est comprimé de 10cm. Quelle énergie potentielle est stockée ?",
];

const ExerciseInput: React.FC<ExerciseInputProps> = ({ onSubmit, isLoading }) => {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) onSubmit(value.trim());
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Collez un énoncé de physique ici..."
            disabled={isLoading}
            rows={3}
            className="w-full resize-none rounded-lg bg-secondary/50 border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            disabled={isLoading || !value.trim()}
            className="h-full min-h-[48px] px-5"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>

      <div className="flex gap-2 flex-wrap">
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            onClick={() => {
              setValue(ex);
              onSubmit(ex);
            }}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-secondary/50 transition-all disabled:opacity-30"
          >
            {ex.slice(0, 50)}...
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExerciseInput;
