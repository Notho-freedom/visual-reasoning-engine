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

