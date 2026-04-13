import { supabase } from "@/integrations/supabase/client";
import type { CognitiveJSON } from "@/types/cognitive";

export async function parseExercise(exercise: string): Promise<CognitiveJSON> {
  const { data, error } = await supabase.functions.invoke("parse-exercise", {
    body: { exercise },
  });

  if (error) {
    throw new Error(error.message || "Erreur lors de l'analyse");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as CognitiveJSON;
}
