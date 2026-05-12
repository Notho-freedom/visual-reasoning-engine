import { supabase } from "@/integrations/supabase/client";
import type { CognitiveJSON } from "@/types/cognitive";
import { validateAndPatch } from "@/lib/validation/cognitiveSchema";

export async function parseExercise(
  exercise: string,
  previousJson?: CognitiveJSON | null,
  modificationPrompt?: string
): Promise<CognitiveJSON> {
  const { data, error } = await supabase.functions.invoke("parse-exercise", {
    body: { exercise, previousJson: previousJson ?? undefined, modificationPrompt },
  });

  if (error) throw new Error(error.message || "Erreur lors de l'analyse");
  if (data?.error) throw new Error(data.error);

  const json = data as CognitiveJSON;
  const report = validateAndPatch(json);
  if (!report.ok) console.warn("[validateAndPatch]", report.warnings);
  return json;
}

export interface ExtractedExercise {
  index: number;
  title: string;
  statement: string;
}

export async function extractDocument(file: File): Promise<ExtractedExercise[]> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Fichier trop volumineux (max 5 Mo)");
  }
  const fileBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip "data:...;base64,"
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });

  const { data, error } = await supabase.functions.invoke("extract-document", {
    body: { fileBase64, mimeType: file.type },
  });
  if (error) throw new Error(error.message || "Échec extraction");
  if (data?.error) throw new Error(data.error);
  return (data?.exercises ?? []) as ExtractedExercise[];
}
