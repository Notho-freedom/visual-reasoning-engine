import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAI } from "../_shared/aiClient.ts";

const SCENARIOS = [
  { id: "freeFall", label: "Chute libre" },
  { id: "inclinedPlane", label: "Plan incliné avec ou sans frottement" },
  { id: "inclinedPulley", label: "Plan incliné relié par une corde sur poulie à une masse suspendue" },
  { id: "projectile", label: "Projectile (tir oblique)" },
  { id: "spring", label: "Ressort horizontal ou vertical (oscillateur)" },
  { id: "pendulum", label: "Pendule simple" },
  { id: "pulley", label: "Poulie d'Atwood (deux masses)" },
  { id: "circuit", label: "Circuit RC (charge/décharge)" },
];

const DIFFICULTY_BRIEFS: Record<string, string> = {
  facile:
    "Niveau facile : une seule question directe. Toutes les données numériques sont fournies. Aucun piège, aucun frottement implicite. 3 à 4 phrases.",
  moyen:
    "Niveau moyen : deux questions enchaînées. Une donnée doit être déduite d'une autre. Frottement possible. 4 à 6 phrases.",
  difficile:
    "Niveau difficile : trois questions liées. Plusieurs étapes (cinématique + énergie ou forces + travail). Frottements ou conditions limites présents. 5 à 8 phrases.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { difficulty, scenario } = await req.json();
    const diff = (typeof difficulty === "string" ? difficulty : "moyen").toLowerCase();
    if (!DIFFICULTY_BRIEFS[diff]) {
      return new Response(JSON.stringify({ error: "difficulté invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const picked =
      (scenario && SCENARIOS.find((s) => s.id === scenario)) ||
      SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];

    const system = `Tu es professeur de physique. Tu rédiges des énoncés d'exercices courts, clairs, en français, avec des valeurs numériques réalistes et cohérentes (unités SI, ordres de grandeur scolaires).
- Pas de solution, pas de schéma, pas de formules.
- Énonce des questions précises ("Calculer…", "Déterminer…").
- Style sobre, pas de mise en forme markdown.`;

    const user = `Génère UN énoncé d'exercice sur le scénario : « ${picked.label} ».
${DIFFICULTY_BRIEFS[diff]}
Renvoie uniquement l'énoncé via l'outil fourni.`;

    const result = await callAI({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.85,
      maxTokens: 600,
      tools: [
        {
          type: "function",
          function: {
            name: "submit_exercise",
            description: "Soumet l'énoncé généré.",
            parameters: {
              type: "object",
              properties: {
                statement: { type: "string", description: "Énoncé complet en français." },
              },
              required: ["statement"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_exercise" } },
    });

    if (!result.ok || !result.toolArgs?.statement) {
      const status = result.status === 429 ? 429 : result.status === 402 ? 402 : 500;
      const message =
        status === 429
          ? "Trop de requêtes — réessaie dans un instant."
          : status === 402
          ? "Crédits IA épuisés."
          : result.error ?? "Échec de génération";
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        statement: result.toolArgs.statement.trim(),
        scenario: picked.id,
        scenarioLabel: picked.label,
        difficulty: diff,
        provider: result.provider,
        model: result.modelUsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-exercise error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
