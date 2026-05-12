import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/aiClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo
const MAX_EXERCISES = 10;

const SYSTEM = `Tu es un assistant qui sépare les exercices de physique d'un sujet.
Tu reçois soit du texte (extrait d'un PDF), soit une image de l'épreuve.
Repère CHAQUE exercice indépendant. Ignore: en-têtes, consignes générales, "Bonne chance", numéros de page, barème global.
Pour chaque exercice détecté, renvoie le texte COMPLET de l'énoncé tel que l'élève doit le lire (recopie fidèle, sans paraphrase).
Si le document ne contient qu'un seul exercice, renvoie un tableau d'un seul élément.`;

const TOOL = {
  type: "function",
  function: {
    name: "split_exercises",
    description: "Sépare les exercices d'un sujet de physique",
    parameters: {
      type: "object",
      properties: {
        exercises: {
          type: "array",
          items: {
            type: "object",
            properties: {
              index: { type: "integer", description: "Numéro 1-based" },
              title: { type: "string", description: "Titre court (ex: 'Exercice 1', 'Partie A')" },
              statement: { type: "string", description: "Texte intégral de l'énoncé" },
            },
            required: ["index", "statement"],
          },
        },
      },
      required: ["exercises"],
    },
  },
};

async function pdfToText(bytes: Uint8Array): Promise<string> {
  // Use pdf-parse via npm
  try {
    const mod = await import("npm:pdf-parse@1.1.1");
    const pdfParse = (mod as any).default ?? mod;
    const result = await pdfParse(bytes);
    return result.text ?? "";
  } catch (e) {
    console.error("pdf-parse failed", e);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileBase64, mimeType } = await req.json();
    if (!fileBase64 || typeof fileBase64 !== "string") {
      return new Response(JSON.stringify({ error: "fileBase64 requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Decode
    const bin = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
    if (bin.byteLength > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Fichier trop volumineux (max 5 Mo)" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPdf = mimeType === "application/pdf" || mimeType?.includes("pdf");
    const isImage = mimeType?.startsWith("image/");

    let result;

    if (isPdf) {
      const text = await pdfToText(bin);
      const cleaned = text.replace(/\s+/g, " ").trim();
      if (cleaned.length > 80) {
        // Texte exploitable — utiliser un modèle texte
        result = await callAI({
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: `Voici le texte du sujet :\n\n${cleaned}` },
          ],
          tools: [TOOL],
          tool_choice: { type: "function", function: { name: "split_exercises" } },
        });
      } else {
        return new Response(JSON.stringify({
          error: "PDF scanné détecté. Convertis-le en image (capture de l'écran) puis re-essaie.",
        }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (isImage) {
      const dataUrl = `data:${mimeType};base64,${fileBase64}`;
      result = await callAI({
        vision: true,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Sépare tous les exercices visibles dans cette image." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "split_exercises" } },
      });
    } else {
      return new Response(JSON.stringify({ error: "Type non supporté (PDF ou image uniquement)" }), {
        status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!result.ok || !result.toolArgs) {
      return new Response(JSON.stringify({ error: result.error ?? "Échec d'extraction" }), {
        status: result.status ?? 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const exercises = (result.toolArgs.exercises ?? [])
      .filter((e: any) => e.statement && e.statement.trim().length > 20)
      .slice(0, MAX_EXERCISES)
      .map((e: any, i: number) => ({
        index: e.index ?? i + 1,
        title: e.title ?? `Exercice ${i + 1}`,
        statement: e.statement.trim(),
      }));

    if (exercises.length === 0) {
      return new Response(JSON.stringify({ error: "Aucun exercice détecté dans le document" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      exercises,
      _meta: { provider: result.provider, model: result.modelUsed, count: exercises.length },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-document error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
