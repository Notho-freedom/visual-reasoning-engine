import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un moteur cognitif de physique. Tu analyses un exercice de physique et tu retournes un plan d'exécution structuré en JSON.

IMPORTANT: Tu dois UNIQUEMENT appeler la fonction "parse_physics_exercise". Ne réponds jamais en texte libre.

Règles:
- Domaine MVP: chute libre uniquement
- Chaque étape du timeline doit avoir un type parmi: concept, equation, solve, vector, motion
- Les étapes doivent avoir des dépendances logiques (champ dependencies)
- Le champ visual décrit comment rendre visuellement l'étape
- Les formules doivent utiliser les constantes définies
- Le titre et les descriptions doivent être en français
- Sois précis dans les calculs numériques`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { exercise } = await req.json();
    if (!exercise || typeof exercise !== "string") {
      return new Response(
        JSON.stringify({ error: "Le champ 'exercise' est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyse cet exercice de physique et retourne le plan cognitif:\n\n${exercise}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_physics_exercise",
              description: "Retourne le plan cognitif structuré pour un exercice de physique",
              parameters: {
                type: "object",
                properties: {
                  meta: {
                    type: "object",
                    properties: {
                      domain: { type: "string" },
                      scenario: { type: "string" },
                      title: { type: "string", description: "Titre descriptif en français" },
                    },
                    required: ["domain", "scenario", "title"],
                  },
                  entities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        type: { type: "string" },
                        mass: { type: "number" },
                        initial_position: { type: "number" },
                        label: { type: "string" },
                      },
                      required: ["id", "type"],
                    },
                  },
                  constants: {
                    type: "object",
                    properties: {
                      g: { type: "number" },
                    },
                  },
                  timeline: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        type: { type: "string", enum: ["concept", "equation", "solve", "vector", "motion"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        formula: { type: "string" },
                        action: { type: "string" },
                        target: { type: "string" },
                        direction: { type: "string" },
                        magnitude: { type: "string" },
                        result: {
                          type: "object",
                          additionalProperties: { type: "number" },
                        },
                        dependencies: {
                          type: "array",
                          items: { type: "string" },
                        },
                        visual: {
                          type: "object",
                          properties: {
                            type: { type: "string" },
                            render: { type: "string" },
                            animate: { type: "boolean" },
                            direction: { type: "string" },
                            label: { type: "string" },
                            color: { type: "string" },
                          },
                        },
                      },
                      required: ["id", "type", "title"],
                    },
                  },
                },
                required: ["meta", "entities", "constants", "timeline"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "parse_physics_exercise" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes. Réessayez dans un instant." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés. Ajoutez des crédits dans les paramètres." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Erreur du moteur IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "L'IA n'a pas retourné de plan structuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cognitiveJSON = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(cognitiveJSON), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-exercise error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
