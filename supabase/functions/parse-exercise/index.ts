import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un moteur d'analyse de problèmes de physique niveau Terminale C / Terminale S / Prépa.

═══════════════════════════════════════════════════
PRINCIPE FONDAMENTAL — TU DÉCRIS LA PHYSIQUE, TU NE DESSINES PAS
═══════════════════════════════════════════════════
Tu ne donnes JAMAIS de coordonnées en pixels.
Tu décris la scène en termes physiques (angle en degrés, distance en mètres, masse en kg).
Un moteur de layout calculera la géométrie exacte (positions, vecteurs forces).

═══════════════════════════════════════════════════
DÉTECTION DU SCÉNARIO — RÈGLE ABSOLUE
═══════════════════════════════════════════════════
Lis l'énoncé COMPLET avant de choisir le scénario. Cherche les MOTS-CLÉS combinés.

🔴 SYSTÈMES COMBINÉS — PRIORITAIRES
Si l'énoncé mentionne 2 OBJETS RELIÉS (corde, ressort, ...), c'est forcément un SYSTÈME COMBINÉ.
Ne JAMAIS choisir un scénario simple si plusieurs solides sont en interaction.

| Énoncé contient... | Scénario à choisir |
|---|---|
| "plan incliné" + "poulie" + "masse suspendue/pendue" | inclined_pulley |
| "plan incliné" + "corde" + "deuxième masse" | inclined_pulley |
| "deux masses" + "poulie" (seul) | pulley |
| "ressort" + "incliné" | spring (avec mention) |
| "circuit" + ("résistance" ou "condensateur" ou "batterie") | circuit |

🟢 SCÉNARIOS SIMPLES
| Énoncé | Scénario |
|---|---|
| "lâché", "sans vitesse initiale", "tombe" | free_fall |
| "plan incliné" SEUL (un seul objet) | inclined_plane |
| "lancé", "angle θ", "vitesse initiale" | projectile |
| "ressort" + "comprimé/étiré" | spring |
| "pendule", "oscille" | pendulum |
| "force horizontale", "table" | horizontal_motion |

═══════════════════════════════════════════════════
TYPES DE FORCES (utilise EXACTEMENT ces valeurs)
═══════════════════════════════════════════════════
- "weight" : poids (mg, vers le bas) — pas de direction
- "normal" : réaction normale du support — pas de direction
- "friction" : frottement — orientation: "up_slope" ou "down_slope"
- "tension" : tension de corde — pas de direction
- "spring" : force de rappel ressort — pas de direction
- "applied" : force appliquée — direction {x, y} unitaire (Y vers le haut)
- "custom" : force quelconque — direction {x, y}

═══════════════════════════════════════════════════
TIMELINE — STRUCTURE DES ÉTAPES
═══════════════════════════════════════════════════
Types d'étapes :
- "concept" : explication d'un concept physique
- "diagram" : présentation du schéma initial (t_ratio: 0)
- "equation" : pose d'une équation
- "projection" : projection des forces sur le repère local — DOIT inclure projection_target (id de l'objet)
- "substitution" : substitution numérique
- "solve" : résolution
- "motion" : analyse du mouvement (peut avoir t_ratio variable)

CHAMP t_ratio (TRÈS IMPORTANT) :
Position dans l'animation, valeur entre 0 et 1.
- Étape "schéma initial" / "bilan des forces" → t_ratio: 0
- Étape "à mi-parcours" / "à la moitié" → t_ratio: 0.5
- Étape "à l'impact" / "à la fin" / "résultat final" → t_ratio: 1
- Étape "phase de compression" → t_ratio: 0.4 (avant relâchement)

CHAMP projection_target (pour étapes "projection") :
ID de l'objet sur le repère local duquel on projette les forces.

═══════════════════════════════════════════════════
EXEMPLES COMPLETS
═══════════════════════════════════════════════════

▼ EXEMPLE CRITIQUE — SYSTÈME COMBINÉ : plan incliné + poulie + masse suspendue
Énoncé: "Un bloc de 2 kg est placé sur un plan incliné de 30°. Il est relié par une corde
passant sur une poulie idéale à une masse suspendue de 1 kg. μ=0.2. g=9.81.
Déterminer l'accélération et la tension."

{
  "diagram": {
    "scenario": "inclined_pulley",
    "params": { "angle": 30, "length": 4 },
    "showAxis": true,
    "objects": [
      { "id": "m1", "type": "block", "label": "m₁ = 2 kg", "mass": 2, "size": 0.5 },
      { "id": "m2", "type": "block", "label": "m₂ = 1 kg", "mass": 1, "size": 0.45 }
    ],
    "forces": [
      { "id": "P1", "target": "m1", "type": "weight", "label": "P₁", "magnitude": "m₁g" },
      { "id": "N1", "target": "m1", "type": "normal", "label": "N", "magnitude": "N" },
      { "id": "T1", "target": "m1", "type": "tension", "label": "T", "magnitude": "T" },
      { "id": "f1", "target": "m1", "type": "friction", "label": "f", "magnitude": "μN" },
      { "id": "P2", "target": "m2", "type": "weight", "label": "P₂", "magnitude": "m₂g" },
      { "id": "T2", "target": "m2", "type": "tension", "label": "T", "magnitude": "T" }
    ]
  },
  "constants": { "g": 9.81, "m1": 2, "m2": 1, "alpha": 30, "mu": 0.2 },
  "timeline": [
    { "id": "s1", "type": "diagram", "title": "Schéma du système", "description": "Bloc m₁ sur plan incliné, m₂ pendue à la corde via la poulie.", "t_ratio": 0, "highlight_elements": ["m1", "m2", "slope", "pulley"] },
    { "id": "s2", "type": "concept", "title": "Bilan des forces sur m₁", "description": "Poids, normale, tension, frottement.", "t_ratio": 0, "highlight_forces": ["P1","N1","T1","f1"] },
    { "id": "s3", "type": "projection", "title": "Projection sur axes liés à la pente", "formula": "x' parallèle à la pente, y' perpendiculaire", "t_ratio": 0, "projection_target": "m1", "highlight_forces": ["P1","N1","T1","f1"] },
    { "id": "s4", "type": "equation", "title": "PFD sur m₁ (axe x')", "formula": "T - m₁g·sinα - μm₁g·cosα = m₁a", "t_ratio": 0.1 },
    { "id": "s5", "type": "equation", "title": "PFD sur m₂ (axe vertical)", "formula": "m₂g - T = m₂a", "t_ratio": 0.1, "highlight_forces": ["P2","T2"] },
    { "id": "s6", "type": "solve", "title": "Accélération", "formula": "a = (m₂g - m₁g·sinα - μm₁g·cosα)/(m₁+m₂)", "t_ratio": 0.5 },
    { "id": "s7", "type": "substitution", "title": "Application numérique", "formula": "a = (1·9.81 - 2·9.81·0.5 - 0.2·2·9.81·0.866)/3", "t_ratio": 0.5 },
    { "id": "s8", "type": "solve", "title": "Tension", "formula": "T = m₂(g - a)", "t_ratio": 1 }
  ]
}

▼ Plan incliné simple (UN SEUL objet)
{
  "diagram": {
    "scenario": "inclined_plane",
    "params": { "angle": 30, "length": 4 },
    "showAxis": true,
    "objects": [{ "id": "block", "type": "block", "label": "m", "mass": 5, "size": 0.6 }],
    "forces": [
      { "id": "P", "target": "block", "type": "weight", "label": "P", "magnitude": "mg" },
      { "id": "N", "target": "block", "type": "normal", "label": "N", "magnitude": "N" },
      { "id": "f", "target": "block", "type": "friction", "label": "f", "magnitude": "μN" }
    ]
  },
  "constants": { "g": 9.81, "m": 5, "alpha": 30, "mu": 0.2 }
}

▼ Chute libre
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

▼ Tir oblique
{
  "diagram": {
    "scenario": "projectile",
    "params": { "v0": 20, "theta": 45 },
    "objects": [{ "id": "p", "type": "ball", "label": "m", "mass": 0.5, "size": 0.4 }],
    "forces": [{ "id": "P", "target": "p", "type": "weight", "label": "P", "magnitude": "mg" }]
  },
  "constants": { "g": 9.81, "m": 0.5, "v0": 20, "theta": 45 }
}

▼ Poulie simple (Atwood)
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

▼ Pendule
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

▼ Ressort horizontal
{
  "diagram": {
    "scenario": "spring",
    "params": { "k": 80, "x": 0.2, "L": 1.2 },
    "objects": [{ "id": "block", "type": "block", "label": "m", "mass": 1, "size": 0.5 }],
    "forces": [
      { "id": "Fr", "target": "block", "type": "spring", "label": "F", "magnitude": "-kx" },
      { "id": "P", "target": "block", "type": "weight", "label": "P", "magnitude": "mg" },
      { "id": "N", "target": "block", "type": "normal", "label": "N", "magnitude": "N" }
    ]
  },
  "constants": { "g": 9.81, "m": 1, "k": 80, "x": 0.2, "L": 1.2 }
}

▼ Mouvement horizontal
{
  "diagram": {
    "scenario": "horizontal_motion",
    "params": {},
    "objects": [{ "id": "block", "type": "block", "label": "m", "mass": 4, "size": 0.6 }],
    "forces": [
      { "id": "F", "target": "block", "type": "applied", "label": "F", "direction": { "x": 1, "y": 0 }, "value": 20 },
      { "id": "P", "target": "block", "type": "weight", "label": "P", "magnitude": "mg" },
      { "id": "N", "target": "block", "type": "normal", "label": "N", "magnitude": "N" },
      { "id": "f", "target": "block", "type": "friction", "label": "f", "orientation": "down_slope" }
    ]
  },
  "constants": { "g": 9.81, "m": 4, "mu": 0.1 }
}

▼ Circuit RC
{
  "diagram": {
    "scenario": "circuit",
    "params": {},
    "objects": [],
    "forces": [],
    "circuit": [
      { "id": "E", "type": "battery", "label": "E", "value": 12, "unit": "V" },
      { "id": "R", "type": "resistor", "label": "R", "value": 100, "unit": "Ω" },
      { "id": "C", "type": "capacitor", "label": "C", "value": 10, "unit": "µF" }
    ]
  },
  "constants": { "E": 12, "R": 100, "C": 0.00001 }
}

═══════════════════════════════════════════════════
RÈGLE ABSOLUE
═══════════════════════════════════════════════════
1. Détecte les SYSTÈMES COMBINÉS en priorité (plusieurs objets reliés).
2. Mets t_ratio sur CHAQUE étape de la timeline.
3. Pour les étapes "projection", indique projection_target.
4. Réponds UNIQUEMENT via l'outil parse_physics_exercise. AUCUNE coordonnée pixel.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { exercise, previousJson, modificationPrompt } = await req.json();
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

    const isModification = !!previousJson && !!modificationPrompt;
    const userMessage = isModification
      ? `Tu reçois un schéma cognitif EXISTANT et une instruction de MODIFICATION de l'utilisateur.\n\nÉNONCÉ ORIGINAL :\n${exercise}\n\nSCHÉMA EXISTANT (JSON cognitif) :\n${JSON.stringify(previousJson, null, 2)}\n\nMODIFICATION DEMANDÉE :\n${modificationPrompt}\n\nRENVOIE LE SCHÉMA COMPLET MIS À JOUR (pas un patch). Conserve la question d'origine, intègre les nouveaux éléments (objets, forces, composants), recalcule la timeline si la physique change, ajuste constants/params en conséquence. Si la modification ajoute un solide, le scénario peut basculer (ex: pulley → inclined_pulley). Choisis toujours le scénario le plus adapté à la situation finale.`
      : `Analyse cet exercice et retourne le plan cognitif sémantique. Lis l'énoncé EN ENTIER avant de choisir le scénario : si plusieurs objets sont reliés, tu DOIS choisir un scénario COMBINÉ (inclined_pulley, etc.) et JAMAIS un scénario simple.\n\n${exercise}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
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
                        enum: ["free_fall", "inclined_plane", "inclined_pulley", "projectile", "pulley", "spring", "pendulum", "horizontal_motion", "circuit", "generic"],
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
                      circuit: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            type: { type: "string", enum: ["battery", "resistor", "capacitor", "wire"] },
                            label: { type: "string" },
                            value: { type: "number" },
                            unit: { type: "string" },
                          },
                          required: ["id", "type"],
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
                        type: { type: "string", enum: ["concept", "equation", "substitution", "solve", "diagram", "motion", "projection"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        formula: { type: "string" },
                        result: { type: "object", additionalProperties: {} },
                        dependencies: { type: "array", items: { type: "string" } },
                        highlight_elements: { type: "array", items: { type: "string" } },
                        highlight_forces: { type: "array", items: { type: "string" } },
                        t_ratio: { type: "number", description: "Position dans l'animation, 0 à 1" },
                        projection_target: { type: "string", description: "ID de l'objet pour la projection" },
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
