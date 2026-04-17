import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un moteur d'analyse de problèmes de physique niveau Terminale C / Terminale S.

PRINCIPE FONDAMENTAL — TU NE DESSINES PAS, TU DÉCRIS LA PHYSIQUE.
Tu ne donnes JAMAIS de coordonnées en pixels.
Tu décris la scène en termes physiques (angle en degrés, distance en mètres, masse en kg).
Un moteur de layout calculera ensuite la géométrie exacte (positions, vecteurs forces).

ÉTAPES :
1. Identifie le domaine (mechanics / electricity / optics)
2. Identifie le SCÉNARIO parmi : free_fall, inclined_plane, projectile, pulley, spring, pendulum, horizontal_motion
3. Extrais les paramètres physiques (params) : angle, length, height, v0, theta, x, L, etc.
4. Liste les objets (objects) avec masse, taille, ancrage
5. Liste les forces (forces) appliquées sur chaque objet : type + label + magnitude symbolique
6. Définis les constantes numériques (constants) : g, m, m1, m2, mu, k, alpha, theta, h, v0...
7. Construis la timeline de résolution étape par étape

TYPES DE FORCES (utilise EXACTEMENT ces valeurs) :
- "weight" : poids (mg, vers le bas) — pas besoin de direction
- "normal" : réaction normale du support — pas besoin de direction
- "friction" : frottement — préciser orientation: "up_slope" ou "down_slope"
- "tension" : tension de corde — pas besoin de direction
- "spring" : force de rappel ressort — pas besoin de direction
- "applied" : force appliquée — fournir direction {x, y} unitaire en repère physique (Y vers le haut)
- "custom" : force quelconque — fournir direction {x, y}

EXEMPLES :

Plan incliné, masse 5kg, angle 30°, frottement μ=0.2 :
{
  "diagram": {
    "scenario": "inclined_plane",
    "params": { "angle": 30, "length": 4 },
    "showAxis": true,
    "objects": [
      { "id": "block", "type": "block", "label": "m", "mass": 5, "anchor": "slope", "distance": 2.5, "size": 0.6 }
    ],
    "forces": [
      { "id": "P", "target": "block", "type": "weight", "label": "P", "magnitude": "mg" },
      { "id": "N", "target": "block", "type": "normal", "label": "N", "magnitude": "N" },
      { "id": "f", "target": "block", "type": "friction", "label": "f", "magnitude": "μN", "orientation": "up_slope" }
    ]
  },
  "constants": { "g": 9.81, "m": 5, "alpha": 30, "mu": 0.2 }
}

Chute libre, hauteur 20m :
{
  "diagram": {
    "scenario": "free_fall",
    "params": { "height": 20 },
    "showAxis": true,
    "objects": [{ "id": "ball", "type": "ball", "label": "m", "mass": 1, "size": 0.4 }],
    "forces": [{ "id": "P", "target": "ball", "type": "weight", "label": "P", "magnitude": "mg" }]
  },
  "constants": { "g": 9.81, "m": 1, "h": 20 }
}

Tir oblique v0=20 m/s, θ=45° :
{
  "diagram": {
    "scenario": "projectile",
    "params": { "v0": 20, "theta": 45 },
    "showAxis": true,
    "objects": [{ "id": "p", "type": "ball", "label": "m", "mass": 0.5, "size": 0.4 }],
    "forces": [{ "id": "P", "target": "p", "type": "weight", "label": "P", "magnitude": "mg" }]
  },
  "constants": { "g": 9.81, "m": 0.5, "v0": 20, "theta": 45 }
}

Poulie avec deux masses m1=2kg, m2=3kg :
{
  "diagram": {
    "scenario": "pulley",
    "params": { "length": 2.5 },
    "objects": [
      { "id": "m1", "type": "block", "label": "m₁", "mass": 2 },
      { "id": "m2", "type": "block", "label": "m₂", "mass": 3 }
    ],
    "forces": [
      { "id": "P1", "target": "m1", "type": "weight", "label": "P₁", "magnitude": "m₁g" },
      { "id": "T1", "target": "m1", "type": "tension", "label": "T", "magnitude": "T" },
      { "id": "P2", "target": "m2", "type": "weight", "label": "P₂", "magnitude": "m₂g" },
      { "id": "T2", "target": "m2", "type": "tension", "label": "T", "magnitude": "T" }
    ]
  },
  "constants": { "g": 9.81, "m1": 2, "m2": 3 }
}

Pendule simple, longueur 1.2m, angle 25° :
{
  "diagram": {
    "scenario": "pendulum",
    "params": { "length": 1.2, "angle": 25 },
    "objects": [{ "id": "bob", "type": "ball", "label": "m", "mass": 0.5, "size": 0.2 }],
    "forces": [
      { "id": "P", "target": "bob", "type": "weight", "label": "P", "magnitude": "mg" },
      { "id": "T", "target": "bob", "type": "tension", "label": "T", "magnitude": "T" }
    ]
  },
  "constants": { "g": 9.81, "m": 0.5, "L": 1.2, "theta": 25 }
}

Ressort horizontal, k=80 N/m, compression x=0.2m, masse 1kg :
{
  "diagram": {
    "scenario": "spring",
    "params": { "k": 80, "x": 0.2, "L": 1.2 },
    "showAxis": true,
    "objects": [{ "id": "block", "type": "block", "label": "m", "mass": 1, "size": 0.5 }],
    "forces": [
      { "id": "Fr", "target": "block", "type": "spring", "label": "F", "magnitude": "-kx" },
      { "id": "P", "target": "block", "type": "weight", "label": "P", "magnitude": "mg" },
      { "id": "N", "target": "block", "type": "normal", "label": "N", "magnitude": "N" }
    ]
  },
  "constants": { "g": 9.81, "m": 1, "k": 80, "x": 0.2, "L": 1.2 }
}

Mouvement horizontal avec force appliquée F=20N, μ=0.1, m=4kg :
{
  "diagram": {
    "scenario": "horizontal_motion",
    "params": {},
    "showAxis": true,
    "objects": [{ "id": "block", "type": "block", "label": "m", "mass": 4, "size": 0.6 }],
    "forces": [
      { "id": "F", "target": "block", "type": "applied", "label": "F", "magnitude": "F", "direction": { "x": 1, "y": 0 }, "value": 20 },
      { "id": "P", "target": "block", "type": "weight", "label": "P", "magnitude": "mg" },
      { "id": "N", "target": "block", "type": "normal", "label": "N", "magnitude": "N" },
      { "id": "f", "target": "block", "type": "friction", "label": "f", "magnitude": "μN", "orientation": "down_slope" }
    ]
  },
  "constants": { "g": 9.81, "m": 4, "mu": 0.1 }
}

TIMELINE :
- Type d'étape : "concept", "equation", "substitution", "solve", "diagram", "motion"
- Chaque étape a un id unique (step_1, step_2...)
- highlight_elements/highlight_forces : ids pour mettre en valeur visuellement

RÈGLE ABSOLUE : Réponds UNIQUEMENT via l'outil parse_physics_exercise. AUCUNE coordonnée pixel.`;

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
          { role: "user", content: `Analyse cet exercice et retourne le plan cognitif sémantique:\n\n${exercise}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_physics_exercise",
              description: "Retourne l'analyse structurée d'un problème de physique en termes PHYSIQUES (jamais en pixels).",
              parameters: {
                type: "object",
                properties: {
                  meta: {
                    type: "object",
                    properties: {
                      domain: { type: "string" },
                      scenario: { type: "string" },
                      title: { type: "string" },
                    },
                    required: ["domain", "scenario", "title"],
                  },
                  constants: {
                    type: "object",
                    additionalProperties: { type: "number" },
                  },
                  diagram: {
                    type: "object",
                    properties: {
                      scenario: {
                        type: "string",
                        enum: ["free_fall", "inclined_plane", "projectile", "pulley", "spring", "pendulum", "horizontal_motion", "circuit", "generic"],
                      },
                      params: {
                        type: "object",
                        additionalProperties: { type: "number" },
                      },
                      showAxis: { type: "boolean" },
                      objects: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            type: { type: "string", enum: ["block", "ball", "particle", "mass"] },
                            label: { type: "string" },
                            mass: { type: "number" },
                            anchor: { type: "string" },
                            distance: { type: "number" },
                            size: { type: "number" },
                            position: {
                              type: "object",
                              properties: { x: { type: "number" }, y: { type: "number" } },
                            },
                          },
                          required: ["id", "type"],
                        },
                      },
                      forces: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            target: { type: "string" },
                            type: {
                              type: "string",
                              enum: ["weight", "normal", "friction", "tension", "applied", "spring", "drag", "reaction", "custom"],
                            },
                            label: { type: "string" },
                            magnitude: { type: "string" },
                            value: { type: "number" },
                            direction: {
                              type: "object",
                              properties: { x: { type: "number" }, y: { type: "number" } },
                            },
                            orientation: { type: "string" },
                            color: { type: "string" },
                          },
                          required: ["id", "target", "type", "label"],
                        },
                      },
                    },
                    required: ["scenario", "params", "objects", "forces"],
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
                required: ["meta", "constants", "diagram", "timeline"],
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
