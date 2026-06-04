import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/aiClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ════════════════════════════════════════════════════════════════════
// HEURISTIQUE DÉTERMINISTE — détection de scénario
// ════════════════════════════════════════════════════════════════════
type ScenarioId =
  | "free_fall" | "inclined_plane" | "inclined_pulley" | "projectile"
  | "pulley" | "spring" | "pendulum" | "horizontal_motion" | "circuit" | "generic";

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function detectScenario(exercise: string): { scenario: ScenarioId; confidence: number; hints: string[] } {
  const t = normalize(exercise);
  const hints: string[] = [];
  const has = (re: RegExp) => re.test(t);

  const incline = has(/\bplan incline\b|\bpente\b|incline(e|s)? (de|d'un)\b|\binclinaison\b/);
  const pulley = has(/\bpoulie\b|\bpoulies\b/);
  const rope = has(/\bcorde\b|\bfil(?! e)\b|\bcable\b/);
  const twoMasses = has(/\b(deux|2)\s+(masses|blocs|solides|corps|objets)\b/) ||
    has(/\bm[12]\b.*\bm[12]\b/) ||
    has(/\bmasse\s+m1\b.*\bmasse\s+m2\b/);
  const suspendedMass = has(/\b(masse\s+)?(suspendue|pendue|accrochee|accroche|reliee|relie)\b/);
  const spring = has(/\bressort\b/);
  const vertical = has(/\bvertical(e|ement)?\b|\bsuspendu(e)?\b|\bpendu(e)?\b/);
  const horizontal = has(/\bhorizontal(e|ement)?\b|\bsur (une |la |un )?table\b|\bsur (le |un )?sol\b/);
  const projectile = has(/\b(projectile|lance(e)?|tire(e)?|tir|jete(e)?|propul(se|sion))\b/);
  const angleTheta = has(/\b(angle|theta|inclinaison)\b.*\b\d/);
  const pendulum = has(/\bpendule\b|\boscille|oscillation|fil de longueur\b/);
  const fall = has(/\b(chute|tombe|lache(e)?|abandonne(e)?|sans vitesse initiale|en chute libre|laisse tomber)\b/);
  const force = has(/\bforce (horizontale|appliquee|f\b|\\?vec\{f\})/);
  const friction = has(/\bfrott(ement|ements|er)\b|\bcoefficient (de )?frottement\b|\bμ\b|\bmu\b/);
  const circuit = has(/\bcircuit\b|\bresistance\b|\bcondensateur\b|\bbobine\b|\bbatterie\b|\bgenerateur\b/);
  const pendulumFil = has(/\bfil (de longueur|inextensible)\b/) && !rope;

  if (incline) hints.push("plan incliné");
  if (pulley) hints.push("poulie");
  if (rope) hints.push("corde/fil");
  if (twoMasses || suspendedMass) hints.push("2+ masses");
  if (spring) hints.push("ressort");
  if (projectile) hints.push("projectile/tir");
  if (pendulum || pendulumFil) hints.push("pendule");
  if (fall) hints.push("chute libre");
  if (circuit) hints.push("circuit");
  if (friction) hints.push("frottement");

  // Décisions ordonnées (les + spécifiques d'abord)
  if (incline && (pulley || (rope && (twoMasses || suspendedMass)))) {
    return { scenario: "inclined_pulley", confidence: 0.95, hints };
  }
  if (circuit) return { scenario: "circuit", confidence: 0.9, hints };
  if (pulley && (twoMasses || suspendedMass)) {
    return { scenario: "pulley", confidence: 0.9, hints };
  }
  if (spring) return { scenario: "spring", confidence: 0.85, hints };
  if (pendulum || pendulumFil) return { scenario: "pendulum", confidence: 0.9, hints };
  if (projectile && (angleTheta || has(/\bv0\b|\bvitesse initiale\b/))) {
    return { scenario: "projectile", confidence: 0.9, hints };
  }
  if (incline) return { scenario: "inclined_plane", confidence: 0.85, hints };
  if (fall) return { scenario: "free_fall", confidence: 0.9, hints };
  if (force && horizontal) return { scenario: "horizontal_motion", confidence: 0.8, hints };

  return { scenario: "generic", confidence: 0.3, hints };
}

// Variantes d'un scénario (orientation, etc.)
function detectVariant(exercise: string, scenario: ScenarioId): Record<string, number> {
  const t = normalize(exercise);
  const v: Record<string, number> = {};
  if (scenario === "spring") {
    if (/\b(vertical|suspendu|pendu|accroche au plafond)\b/.test(t)) v.vertical = 1;
  }
  if (scenario === "projectile") {
    if (/\bhorizontal(ement)?\b/.test(t) && !/\bangle|theta\b/.test(t)) {
      v.theta = 0;
    }
    const hMatch = exercise.match(/(?:hauteur|altitude|du haut|d'une (?:tour|falaise|plate-forme))[^.]{0,40}?(\d+(?:[.,]\d+)?)\s*(m|cm)\b/i);
    if (hMatch) {
      let h = parseFloat(hMatch[1].replace(",", "."));
      if (hMatch[2].toLowerCase() === "cm") h /= 100;
      v.h0 = h;
    }
  }
  return v;
}

// ════════════════════════════════════════════════════════════════════
// PASSE 1 — EXTRACTEUR
// ════════════════════════════════════════════════════════════════════
const EXTRACTOR_SYSTEM = `Tu es un extracteur d'énoncés de physique en français.
Pour chaque énoncé, retourne via l'outil:
- parameters: TOUS les nombres mentionnés avec leur symbole, valeur, unité d'origine et rôle.
  Rôles autorisés: angle, mass, friction_coef, initial_speed, final_speed, height, length, spring_const,
  resistance, capacitance, voltage, current, gravity, distance, time, force_value, drag_force, work, energy, acceleration, other.
  IMPORTANT: traite les nombres français avec virgule comme décimaux (ex: "0,15" => 0.15 ; "2,0 kg" => 2.0).
- entities: les solides/objets distincts (id court, label lisible, type: block|ball|particle|mass|circuit_component).
- liaisons: liens physiques (corde entre m1 et m2, ressort entre mur et m, poulie reliant m1 et m2…).
- question: ce qu'on demande de calculer (texte court, ex: "accélération et tension").
- keywords: liste des mots-clés physiques détectés.
N'INVENTE RIEN. Si une valeur n'est pas dans l'énoncé, ne la mets pas.`;

const EXTRACTOR_TOOL = {
  type: "function",
  function: {
    name: "extract_exercise",
    description: "Extrait les paramètres bruts d'un énoncé de physique",
    parameters: {
      type: "object",
      properties: {
        parameters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              symbol: { type: "string" },
              value: { type: "number" },
              unit: { type: "string" },
              role: { type: "string" },
            },
            required: ["symbol", "value", "role"],
          },
        },
        entities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              type: { type: "string" },
            },
            required: ["id", "type"],
          },
        },
        liaisons: { type: "array", items: { type: "string" } },
        question: { type: "string" },
        keywords: { type: "array", items: { type: "string" } },
      },
      required: ["parameters", "entities"],
    },
  },
};

// Conversion → SI
function toSI(value: number, unit: string | undefined, role: string): number {
  const u = (unit ?? "").toLowerCase().trim();
  if (!u) return value;
  if (role === "mass") {
    if (u === "g" || u === "gramme" || u === "grammes") return value / 1000;
    if (u === "mg") return value / 1e6;
    if (u === "t" || u === "tonne") return value * 1000;
  }
  if (role === "length" || role === "height" || role === "distance") {
    if (u === "cm") return value / 100;
    if (u === "mm") return value / 1000;
    if (u === "km") return value * 1000;
  }
  if (role === "initial_speed") {
    if (u === "km/h") return value / 3.6;
  }
  if (role === "angle") {
    if (u === "rad" || u === "radian" || u === "radians") return (value * 180) / Math.PI;
  }
  if (role === "force_value") {
    if (u === "kn") return value * 1000;
    if (u === "mn") return value / 1000;
  }
  if (role === "capacitance") {
    if (u === "µf" || u === "uf" || u === "microfarad") return value * 1e-6;
    if (u === "nf") return value * 1e-9;
    if (u === "pf") return value * 1e-12;
  }
  if (role === "resistance") {
    if (u === "kω" || u === "kohm" || u === "kohms") return value * 1000;
    if (u === "mω" || u === "mohm") return value * 1e6;
  }
  return value;
}

interface ExtractedParam { symbol: string; value: number; unit?: string; role: string }
interface Extraction {
  parameters: ExtractedParam[];
  entities: { id: string; label?: string; type: string }[];
  liaisons?: string[];
  question?: string;
  keywords?: string[];
}

async function callExtractor(exercise: string): Promise<Extraction | null> {
  const r = await callAI({
    messages: [
      { role: "system", content: EXTRACTOR_SYSTEM },
      { role: "user", content: exercise },
    ],
    tools: [EXTRACTOR_TOOL],
    tool_choice: { type: "function", function: { name: "extract_exercise" } },
  });
  if (!r.ok || !r.toolArgs) {
    console.error("Extractor failed", r.error);
    return null;
  }
  console.log(`[extractor] ${r.provider}/${r.modelUsed}`);
  return r.toolArgs as Extraction;
}

// ════════════════════════════════════════════════════════════════════
// PASSE 2 — CONSTRUCTEUR (system prompt enrichi)
// ════════════════════════════════════════════════════════════════════
const CONSTRUCTOR_SYSTEM = `Tu es un moteur d'analyse de problèmes de physique niveau Terminale C / Prépa.

═══════════════════════════════════════════════════
PRINCIPE : tu décris la PHYSIQUE, jamais les pixels.
═══════════════════════════════════════════════════
Tu reçois (1) l'énoncé (2) une extraction des paramètres (3) un scénario suggéré par heuristique.
Respecte le scénario suggéré sauf si physiquement impossible.
N'INVENTE PAS de valeurs : utilise UNIQUEMENT celles de l'énoncé/extraction.
Tous les nombres de l'extraction DOIVENT apparaître dans \`constants\`.

═══════════════════════════════════════════════════
SCÉNARIOS AUTORISÉS
═══════════════════════════════════════════════════
free_fall, inclined_plane, inclined_pulley, projectile, pulley, spring, pendulum, horizontal_motion, circuit, generic.

VARIANTES (passées via params, valeurs NUMÉRIQUES uniquement) :
- spring vertical : ajouter params.vertical = 1 (ressort suspendu, gravité active sur la masse).
- projectile depuis hauteur : params.h0 = hauteur en m (+ params.v0, params.theta).
- projectile horizontal (tir tendu) : params.theta = 0 ET params.h0 > 0.
- inclined_plane + force appliquée : ajouter une force type "applied" avec direction { x, y } unitaire.

═══════════════════════════════════════════════════
TYPES DE FORCES
═══════════════════════════════════════════════════
weight, normal, friction, tension, applied (avec direction unitaire), spring, drag, custom.
Pour "friction", orientation: "up_slope" | "down_slope" | "opposite_motion".

═══════════════════════════════════════════════════
TIMELINE
═══════════════════════════════════════════════════
Types d'étapes : concept, diagram, equation, projection, substitution, solve, motion.
- t_ratio ∈ [0,1] OBLIGATOIRE par étape.
  diagram/bilan → 0 ; mi-parcours → 0.5 ; fin/impact → 1.
- "projection" doit avoir projection_target = id de l'objet.
- Construis la timeline pour répondre à LA QUESTION POSÉE.

═══════════════════════════════════════════════════
RÈGLES DE COHÉRENCE STRICTES
═══════════════════════════════════════════════════
1. Chaque \`forces[].target\` DOIT exister dans \`objects[]\`.
2. inclined_plane / inclined_pulley : params.angle ET params.length OBLIGATOIRES.
3. inclined_pulley : exactement 2 objets, chacun avec une force "tension".
4. projectile : params.v0 obligatoire ; params.theta obligatoire (0 si tir horizontal).
5. pendulum : params.length ET params.angle obligatoires.
6. spring : params.k obligatoire.
7. circuit : circuit[] non vide.
8. Tout paramètre numérique de l'énoncé apparaît dans constants (avec son symbole canonique : g, m, m1, m2, alpha, mu, v0, theta, h, h0, k, x, L, R, C, E, …).

Réponds UNIQUEMENT via l'outil parse_physics_exercise.`;

const CONSTRUCTOR_TOOL = {
  type: "function",
  function: {
    name: "parse_physics_exercise",
    description: "Retourne l'analyse structurée d'un problème de physique en termes PHYSIQUES.",
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
        constants: { type: "object", additionalProperties: { type: "number" } },
        diagram: {
          type: "object",
          properties: {
            scenario: {
              type: "string",
              enum: ["free_fall", "inclined_plane", "inclined_pulley", "projectile", "pulley", "spring", "pendulum", "horizontal_motion", "circuit", "generic"],
            },
            params: { type: "object", additionalProperties: { type: "number" } },
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
              t_ratio: { type: "number" },
              projection_target: { type: "string" },
            },
            required: ["id", "type", "title"],
          },
        },
      },
      required: ["meta", "constants", "diagram", "timeline"],
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// VALIDATION (règles physiques)
// ════════════════════════════════════════════════════════════════════
interface ValidationResult { ok: boolean; errors: string[] }

function validate(json: any): ValidationResult {
  const errors: string[] = [];
  if (!json || typeof json !== "object") return { ok: false, errors: ["JSON invalide"] };
  const d = json.diagram;
  if (!d) errors.push("diagram manquant");
  else {
    const objIds = new Set((d.objects ?? []).map((o: any) => o.id));
    (d.forces ?? []).forEach((f: any, i: number) => {
      if (!objIds.has(f.target)) errors.push(`forces[${i}].target='${f.target}' n'existe pas dans objects`);
    });
    const sc = d.scenario;
    const p = d.params ?? {};
    if (sc === "inclined_plane" || sc === "inclined_pulley") {
      if (typeof p.angle !== "number") errors.push(`params.angle requis pour ${sc}`);
      if (typeof p.length !== "number") errors.push(`params.length requis pour ${sc}`);
      if (p.angle != null && (p.angle <= 0 || p.angle >= 90)) errors.push(`angle hors plage (0,90): ${p.angle}`);
    }
    if (sc === "inclined_pulley" && (d.objects ?? []).length !== 2) {
      errors.push(`inclined_pulley exige 2 objets, ${(d.objects ?? []).length} fourni(s)`);
    }
    if (sc === "projectile") {
      if (typeof p.v0 !== "number") errors.push("params.v0 requis pour projectile");
      if (typeof p.theta !== "number") errors.push("params.theta requis pour projectile (0 si horizontal)");
    }
    if (sc === "pendulum") {
      if (typeof p.length !== "number") errors.push("params.length requis pour pendulum");
      if (typeof p.angle !== "number") errors.push("params.angle requis pour pendulum");
    }
    if (sc === "spring") {
      if (typeof p.k !== "number") errors.push("params.k requis pour spring");
    }
    if (sc === "circuit" && (!d.circuit || d.circuit.length === 0)) {
      errors.push("circuit[] requis et non vide pour scenario=circuit");
    }
    (d.objects ?? []).forEach((o: any, i: number) => {
      if (o.mass != null && o.mass <= 0) errors.push(`objects[${i}].mass <= 0`);
    });
  }
  if (!Array.isArray(json.timeline) || json.timeline.length === 0) errors.push("timeline vide");
  else {
    json.timeline.forEach((s: any, i: number) => {
      if (s.t_ratio != null && (s.t_ratio < 0 || s.t_ratio > 1)) {
        errors.push(`timeline[${i}].t_ratio hors [0,1]`);
      }
      if (s.type === "projection" && !s.projection_target) {
        errors.push(`timeline[${i}] (projection) sans projection_target`);
      }
    });
  }
  return { ok: errors.length === 0, errors };
}

// Récupère une valeur SI depuis l'extraction par rôle (premier match)
function findExtracted(extraction: Extraction | null, role: string): number | undefined {
  if (!extraction?.parameters) return undefined;
  const p = extraction.parameters.find(x => x.role === role);
  if (!p) return undefined;
  return toSI(p.value, p.unit, p.role);
}

// Patch local minimal — comble les manques sûrs en utilisant l'extraction
function patchDefaults(json: any, extraction: Extraction | null = null): any {
  if (!json?.diagram) return json;
  const d = json.diagram;
  d.params = d.params ?? {};
  const get = (role: string) => findExtracted(extraction, role);

  if (d.scenario === "inclined_plane" || d.scenario === "inclined_pulley") {
    if (typeof d.params.angle !== "number") d.params.angle = get("angle") ?? 30;
    if (typeof d.params.length !== "number") d.params.length = get("length") ?? get("distance") ?? 4;
  }
  if (d.scenario === "projectile") {
    if (typeof d.params.v0 !== "number") d.params.v0 = get("initial_speed") ?? 20;
    if (typeof d.params.theta !== "number") d.params.theta = get("angle") ?? 45;
    const h0 = get("height");
    if (typeof d.params.h0 !== "number" && h0 != null) d.params.h0 = h0;
  }
  if (d.scenario === "pendulum") {
    if (typeof d.params.length !== "number") d.params.length = get("length") ?? 1.2;
    if (typeof d.params.angle !== "number") d.params.angle = get("angle") ?? 20;
  }
  if (d.scenario === "spring") {
    if (typeof d.params.k !== "number") d.params.k = get("spring_const") ?? 50;
  }
  // Masse: si un objet n'a pas de masse, on injecte la masse extraite
  const m = get("mass");
  if (m != null) {
    (d.objects ?? []).forEach((o: any) => { if (typeof o.mass !== "number") o.mass = m; });
  }
  // Filtrer forces orphelines
  const ids = new Set((d.objects ?? []).map((o: any) => o.id));
  d.forces = (d.forces ?? []).filter((f: any) => ids.has(f.target));
  if (Array.isArray(json.timeline)) {
    json.timeline.forEach((s: any) => {
      if (typeof s.t_ratio !== "number") s.t_ratio = 0;
      s.t_ratio = Math.max(0, Math.min(1, s.t_ratio));
    });
  }
  return json;
}

// ════════════════════════════════════════════════════════════════════
// CONSTRUCTEUR
// ════════════════════════════════════════════════════════════════════
async function callConstructor(
  userMessage: string,
): Promise<{ status: number; json?: any; error?: string; provider?: string; model?: string }> {
  const r = await callAI({
    messages: [
      { role: "system", content: CONSTRUCTOR_SYSTEM },
      { role: "user", content: userMessage },
    ],
    tools: [CONSTRUCTOR_TOOL],
    tool_choice: { type: "function", function: { name: "parse_physics_exercise" } },
  });
  if (!r.ok) {
    if (r.status === 429) return { status: 429, error: "Trop de requêtes. Réessayez dans un instant." };
    if (r.status === 402) return { status: 402, error: "Crédits IA épuisés." };
    return { status: 500, error: r.error ?? "Erreur du moteur IA" };
  }
  if (!r.toolArgs) return { status: 500, error: "L'IA n'a pas retourné de plan structuré" };
  console.log(`[constructor] ${r.provider}/${r.modelUsed}`);
  return { status: 200, json: r.toolArgs, provider: r.provider, model: r.modelUsed };
}

function buildUserMessage(args: {
  exercise: string;
  extraction: Extraction | null;
  scenario: ScenarioId;
  hints: string[];
  variant: Record<string, number>;
  isModification: boolean;
  previousJson?: unknown;
  modificationPrompt?: string;
  retryErrors?: string[];
}): string {
  const { exercise, extraction, scenario, hints, variant, isModification, previousJson, modificationPrompt, retryErrors } = args;
  const ctxBlocks: string[] = [];
  ctxBlocks.push(`SCÉNARIO SUGGÉRÉ (heuristique) : ${scenario}${hints.length ? `  [signaux: ${hints.join(", ")}]` : ""}`);
  if (Object.keys(variant).length) ctxBlocks.push(`VARIANTE DÉTECTÉE : ${JSON.stringify(variant)}`);
  if (extraction) {
    const params = (extraction.parameters ?? []).map(p =>
      `  - ${p.symbol} = ${p.value}${p.unit ? " " + p.unit : ""}  (rôle: ${p.role}, SI: ${toSI(p.value, p.unit, p.role)})`
    ).join("\n");
    ctxBlocks.push(`PARAMÈTRES EXTRAITS (TOUS doivent apparaître dans constants) :\n${params || "  (aucun)"}`);
    if (extraction.entities?.length) {
      ctxBlocks.push(`ENTITÉS : ${extraction.entities.map(e => `${e.id}(${e.type})`).join(", ")}`);
    }
    if (extraction.liaisons?.length) ctxBlocks.push(`LIAISONS : ${extraction.liaisons.join(" ; ")}`);
    if (extraction.question) ctxBlocks.push(`QUESTION POSÉE : ${extraction.question}`);
  }
  if (retryErrors?.length) {
    ctxBlocks.push(`⚠️ PRÉCÉDENTE TENTATIVE INVALIDE — corrige ces erreurs :\n  - ${retryErrors.join("\n  - ")}`);
  }
  const ctx = ctxBlocks.join("\n\n");

  if (isModification) {
    return `Tu reçois un schéma cognitif EXISTANT et une instruction de MODIFICATION.

ÉNONCÉ ORIGINAL :
${exercise}

${ctx}

SCHÉMA EXISTANT :
${JSON.stringify(previousJson, null, 2)}

MODIFICATION DEMANDÉE :
${modificationPrompt}

Renvoie le schéma COMPLET mis à jour, en respectant le scénario suggéré et toutes les règles de cohérence.`;
  }

  return `Analyse cet exercice et retourne le plan cognitif structuré.

ÉNONCÉ :
${exercise}

${ctx}

Respecte le scénario suggéré. Mets TOUS les paramètres extraits dans constants. Construis la timeline pour répondre à la question.`;
}

// ════════════════════════════════════════════════════════════════════
// HANDLER
// ════════════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { exercise, previousJson, modificationPrompt } = await req.json();
    if (!exercise || typeof exercise !== "string") {
      return new Response(JSON.stringify({ error: "Le champ 'exercise' est requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const isModification = !!previousJson && !!modificationPrompt;

    // Passe 1 — extraction (cascade OpenRouter free → fallback Lovable)
    const extraction = await callExtractor(exercise);

    // Heuristique scénario
    const { scenario, hints } = detectScenario(exercise);
    const variant = detectVariant(exercise, scenario);

    // Passe 2 — construction
    let userMessage = buildUserMessage({
      exercise, extraction, scenario, hints, variant,
      isModification, previousJson, modificationPrompt,
    });

    let result = await callConstructor(userMessage);
    if (result.status !== 200 || !result.json) {
      return new Response(JSON.stringify({ error: result.error ?? "Erreur" }), {
        status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validation + auto-retry silencieux (1×)
    let v = validate(result.json);
    if (!v.ok) {
      console.warn("Validation 1 KO:", v.errors);
      userMessage = buildUserMessage({
        exercise, extraction, scenario, hints, variant,
        isModification, previousJson, modificationPrompt,
        retryErrors: v.errors,
});
      const retry = await callConstructor(userMessage);
      if (retry.status === 200 && retry.json) {
        result = retry;
        v = validate(result.json);
      }
    }

    // Patch local final si toujours KO
    if (!v.ok) {
      console.warn("Validation 2 KO, patch local:", v.errors);
      result.json = patchDefaults(result.json, extraction);
    }

    // Annoter avec le provider/modèle utilisé pour le badge UI
    result.json._meta = { provider: result.provider, model: result.model };

    return new Response(JSON.stringify(result.json), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-exercise error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
