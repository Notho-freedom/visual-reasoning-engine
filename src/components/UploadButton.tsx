import React, { useRef, useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import { extractDocument, type ExtractedExercise } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  onExtracted: (exercises: ExtractedExercise[]) => void;
  className?: string;
  variant?: "icon" | "button";
}

const UploadButton: React.FC<Props> = ({ onExtracted, className, variant = "icon" }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      toast({ title: "Lecture du document…", description: file.name });
      const exercises = await extractDocument(file);
      toast({
        title: "Exercices détectés",
        description: `${exercises.length} exercice${exercises.length > 1 ? "s" : ""} — traitement en cours`,
      });
      onExtracted(exercises);
    } catch (e) {
      toast({
        title: "Échec extraction",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      {variant === "button" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => ref.current?.click()}
          className={cn(
            "inline-flex items-center gap-2 h-9 px-4 rounded-full bg-card border border-border text-sm hover:border-foreground/40 hover:shadow-soft transition disabled:opacity-50",
            className,
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          {busy ? "Lecture…" : "Importer un sujet (PDF, image)"}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => ref.current?.click()}
          title="Importer un sujet (PDF, image)"
          className={cn(
            "h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition disabled:opacity-50",
            className,
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>
      )}
    </>
  );
};

export default UploadButton;
