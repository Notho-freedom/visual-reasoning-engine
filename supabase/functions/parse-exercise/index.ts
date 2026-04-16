import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un moteur d'analyse de problèmes de physique niveau Terminale C / Terminale S.

Tu reçois un énoncé de physique en français. Tu dois :
1. Identifier le domaine (mechanics, electricity, optics, thermodynamics...)
2. Extraire les entités physiques (objets, masses, charges, résistances...)
3. Construire un diagramme SVG (scene graph) avec les éléments visuels appropriés
4. Générer une timeline de résolution pas à pas

RÈGLES STRICTES :
- Réponds UNIQUEMENT via l'outil parse_physics_exercise
- Toutes les valeurs numériques doivent être correctes physiquement
- Le diagramme doit utiliser un canvas de 600x450 pixels
- Positionne les éléments de manière claire et lisible
- Les forces doivent avoir des directions normalisées (vecteurs unitaires)
- Chaque étape de la timeline doit avoir un id unique (step_1, step_2...)
- Les highlight_elements et highlight_forces permettent de lier une étape à des éléments visuels

TYPES D'ÉLÉMENTS SUPPORTÉS :
ground, slope, object, spring, rope, pulley, wall, axis, wire, resistor, capacitor, battery, switch, projectile_path, dimension

TYPES D'ÉTAPES :
concept (explication théorique), equation (mise en équation), substitution (remplacement numérique), solve (résolution), diagram (description du schéma), motion (animation/mouvement)

EXEMPLES DE SCÉNARIOS :
- Chute libre : ground + object + axis + forces (poids)
- Plan incliné : ground + slope + object + axis + forces (poids, normale, frottement)
- Poulie : ground + pulley + rope + 2 objects + forces
- Projectile : ground + object + axis + projectile_path + forces
- Ressort : wall + spring + object + forces
- Circuit : battery + wire + resistor/capacitor + switch

Pour les couleurs des forces, utilise :
- Poids : "hsl(0, 72%, 51%)" (rouge)
- Normale : "hsl(142, 71%, 45%)" (vert)
- Frottement : "hsl(38, 92%, 50%)" (orange)
- Tension : "hsl(217, 91%, 60%)" (bleu)
- Réaction : "hsl(262, 83%, 58%)" (violet)
- Force appliquée : "hsl(217, 91%, 60%)" (bleu)`;

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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyse cet exercice de physique et retourne le plan cognitif:\n\n${exercise}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_physics_exercise",
              description: "Retourne l'analyse structurée d'un problème de physique avec diagramme et résolution.",
              parameters: {
                type: "object",
                properties: {
                  meta: {
                    type: "object",
                    properties: {
                      domain: { type: "string", description: "Domaine : mechanics, electricity, optics, thermodynamics" },
                      scenario: { type: "string", description: "Type : free_fall, inclined_plane, projectile, pulley, spring, pendulum, circuit, etc." },
                      title: { type: "string", description: "Titre court décrivant le problème" },
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
                        label: { type: "string" },
                        properties: {
                          type: "object",
                          additionalProperties: { type: "number" },
                        },
                        position: {
                          type: "object",
                          properties: { x: { type: "number" }, y: { type: "number" } },
                        },
                        connections: { type: "array", items: { type: "string" } },
                      },
                      required: ["id", "type", "label", "properties"],
                    },
                  },
                  constants: {
                    type: "object",
                    additionalProperties: { type: "number" },
                    description: "Constantes du problème (g, k, mu, etc.)",
                  },
                  diagram: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      width: { type: "number" },
                      height: { type: "number" },
                      elements: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            type: { type: "string", enum: ["ground", "slope", "object", "spring", "rope", "pulley", "wall", "axis", "wire", "resistor", "capacitor", "battery", "switch", "projectile_path", "dimension"] },
                            position: {
                              type: "object",
                              properties: { x: { type: "number" }, y: { type: "number" } },
                              required: ["x", "y"],
                            },
                            rotation: { type: "number" },
                            dimensions: {
                              type: "object",
                              properties: { width: { type: "number" }, height: { type: "number" } },
                            },
                            label: { type: "string" },
                            style: {
                              type: "object",
                              properties: {
                                color: { type: "string" },
                                strokeWidth: { type: "number" },
                                dashed: { type: "boolean" },
                                fill: { type: "string" },
                              },
                            },
                            properties: { type: "object", additionalProperties: {} },
                          },
                          required: ["id", "type", "position"],
                        },
                      },
                      forces: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            label: { type: "string" },
                            target: { type: "string" },
                            application_point: {
                              type: "object",
                              properties: { x: { type: "number" }, y: { type: "number" } },
                              required: ["x", "y"],
                            },
                            direction: {
                              type: "object",
                              properties: { x: { type: "number" }, y: { type: "number" } },
                              required: ["x", "y"],
                            },
                            magnitude: { type: "string" },
                            color: { type: "string" },
                          },
                          required: ["id", "label", "target", "application_point", "direction", "magnitude"],
                        },
                      },
                    },
                    required: ["type", "width", "height", "elements", "forces"],
                  },
                  timeline: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        type: { type: "string", enum: ["concept", "equation", "substitution", "solve", "diagram", "motion"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        formula: { type: "string" },
                        result: { type: "object", additionalProperties: {} },
                        dependencies: { type: "array", items: { type: "string" } },
                        highlight_elements: { type: "array", items: { type: "string" } },
                        highlight_forces: { type: "array", items: { type: "string" } },
                      },
                      required: ["id", "type", "title"],
                    },
                  },
                },
                required: ["meta", "entities", "constants", "diagram", "timeline"],
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
