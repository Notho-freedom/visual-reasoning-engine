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

function findAllExtracted(extraction: Extraction | null, role: string): number[] {
  if (!extraction?.parameters) return [];
  return extraction.parameters
    .filter(x => x.role === role)
    .map(p => toSI(p.value, p.unit, p.role));
}

// Fallback regex : extrait nombres français quand l'IA oublie
function regexExtract(exercise: string): Partial<Record<string, number>> {
  const out: Partial<Record<string, number>> = {};
  const num = "(-?\\d+(?:[.,]\\d+)?)";
  const parse = (s: string) => parseFloat(s.replace(",", "."));
  const grab = (re: RegExp): number | undefined => {
    const m = exercise.match(re);
    return m ? parse(m[1]) : undefined;
  };
  // masse
  let m = grab(new RegExp(`m\\s*=\\s*${num}\\s*kg`, "i"));
  if (m == null) { const g = grab(new RegExp(`m\\s*=\\s*${num}\\s*g\\b`, "i")); if (g != null) m = g / 1000; }
  if (m != null) out.mass = m;
  const v0 = grab(new RegExp(`v0?\\s*=\\s*${num}\\s*m/s`, "i"));
  if (v0 != null) out.v0 = v0;
  const theta = grab(new RegExp(`${num}\\s*(?:°|degr[ée]s?)`, "i"));
  if (theta != null) out.theta = theta;
  const fric = grab(new RegExp(`(?:μ|mu)\\s*=\\s*${num}`, "i")) ?? grab(new RegExp(`coefficient[^=]*=\\s*${num}`, "i"));
  if (fric != null) out.mu = fric;
  const fdrag = grab(new RegExp(`f\\s*=\\s*${num}\\s*N`, "i"));
  if (fdrag != null) out.drag = fdrag;
  const work = grab(new RegExp(`-?${num}\\s*(?:J|Joules?)`, "i"));
  if (work != null) out.work = work;
  const h = grab(new RegExp(`(?:hauteur|altitude|h)\\s*=?\\s*${num}\\s*m\\b`, "i"));
  if (h != null) out.h = h;
  return out;
}

// ════════════════════════════════════════════════════════════════════
// REPAIR ENGINE — reconstruit un plan exploitable même si l'IA a vidé
// objects / forces / timeline.
// ════════════════════════════════════════════════════════════════════
const DEFAULT_OBJECT_BY_SCENARIO: Record<string, { id: string; type: "ball" | "block" | "particle" | "mass"; label: string }[]> = {
  free_fall: [{ id: "obj", type: "ball", label: "Objet" }],
  projectile: [{ id: "P", type: "ball", label: "Projectile" }],
  inclined_plane: [{ id: "bloc", type: "block", label: "Bloc" }],
  inclined_pulley: [
    { id: "m1", type: "block", label: "m₁ (plan)" },
    { id: "m2", type: "mass", label: "m₂ (suspendue)" },
  ],
  pulley: [
    { id: "m1", type: "mass", label: "m₁" },
    { id: "m2", type: "mass", label: "m₂" },
  ],
  spring: [{ id: "m", type: "block", label: "Masse" }],
  pendulum: [{ id: "bob", type: "ball", label: "Pendule" }],
  horizontal_motion: [{ id: "bloc", type: "block", label: "Bloc" }],
  generic: [{ id: "obj", type: "particle", label: "Objet" }],
};

function defaultForces(scenario: string, objIds: string[], hints: { mu?: number; drag?: number }): any[] {
  const f: any[] = [];
  const add = (id: string, target: string, type: string, label: string, extras: any = {}) =>
    f.push({ id, target, type, label, ...extras });
  if (scenario === "free_fall" || scenario === "projectile") {
    add("P", objIds[0], "weight", "P⃗");
    if (hints.drag && hints.drag > 0) add("f", objIds[0], "drag", "f⃗", { value: hints.drag });
  } else if (scenario === "inclined_plane") {
    add("P", objIds[0], "weight", "P⃗");
    add("N", objIds[0], "normal", "N⃗");
    if (hints.mu && hints.mu > 0) add("f", objIds[0], "friction", "f⃗", { orientation: "up_slope" });
  } else if (scenario === "horizontal_motion") {
    add("P", objIds[0], "weight", "P⃗");
    add("N", objIds[0], "normal", "N⃗");
    add("F", objIds[0], "applied", "F⃗", { direction: { x: 1, y: 0 } });
    if (hints.mu && hints.mu > 0) add("f", objIds[0], "friction", "f⃗");
  } else if (scenario === "pulley" || scenario === "inclined_pulley") {
    objIds.forEach((id, i) => {
      add(`P${i + 1}`, id, "weight", `P⃗${i + 1}`);
      add(`T${i + 1}`, id, "tension", `T⃗${i + 1}`);
    });
    if (scenario === "inclined_pulley" && objIds[0]) add("N1", objIds[0], "normal", "N⃗");
  } else if (scenario === "spring") {
    add("P", objIds[0], "weight", "P⃗");
    add("N", objIds[0], "normal", "N⃗");
    add("Fr", objIds[0], "spring", "F⃗_ressort");
  } else if (scenario === "pendulum") {
    add("P", objIds[0], "weight", "P⃗");
    add("T", objIds[0], "tension", "T⃗");
  }
  return f;
}

function defaultTimeline(scenario: string, constants: Record<string, number>): any[] {
  const g = constants.g ?? 9.81;
  const r = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "—");
  const steps: any[] = [];
  const push = (id: string, type: string, title: string, extras: any = {}) =>
    steps.push({ id, type, title, t_ratio: extras.t_ratio ?? 0, ...extras });

  if (scenario === "projectile") {
    const v0 = constants.v0 ?? 20;
    const th = constants.theta ?? 45;
    const m = constants.m ?? 1;
    const W = constants.W ?? 0;
    const rad = (th * Math.PI) / 180;
    const vx = v0 * Math.cos(rad);
    const vy = v0 * Math.sin(rad);
    const hMaxIdeal = (vy * vy) / (2 * g);
    const tFlight = (2 * vy) / g;
    const range = vx * tFlight;
    const hMax = W !== 0 ? hMaxIdeal + W / (m * g) : hMaxIdeal;
    push("s1", "concept", "Données de l'énoncé", {
      description: `v₀ = ${v0} m/s, θ = ${th}°, m = ${m} kg, g = ${g} m/s².${W !== 0 ? ` Travail des frottements W_f = ${W} J.` : ""}`,
      t_ratio: 0,
    });
    push("s2", "diagram", "Bilan des forces", {
      description: W !== 0 ? "Poids P⃗ et force de traînée f⃗ opposée au mouvement." : "Poids P⃗ uniquement (chute libre).",
      t_ratio: 0,
    });
    push("s3", "equation", "Théorème de l'énergie cinétique (départ → sommet)",
      { formula: "½ m v_S² − ½ m v₀² = W(P⃗) + W(f⃗)", t_ratio: 0.25 });
    push("s4", "substitution", "Au sommet : v_S = v_x = v₀ cos θ",
      { formula: `v_S = ${v0} · cos(${th}°) = ${r(vx)} m/s`, t_ratio: 0.5 });
    push("s5", "solve", "Altitude maximale", {
      formula: "h_max = (v₀² sin²θ) / (2g) + |W_f|/(m g)",
      result: { h_max: `${r(hMax)} m`, v_sommet: `${r(vx)} m/s`, t_vol: `${r(tFlight)} s`, R: `${r(range)} m` },
      t_ratio: 0.7,
    });
    push("s6", "solve", "Vitesse au retour à l'altitude initiale", {
      description: "TEC sur l'aller-retour : ½m v² − ½m v₀² = W_total",
      formula: "v = √(v₀² + 2·W_total/m)",
      result: { v_retour: W !== 0 ? `${r(Math.sqrt(Math.max(0, v0 * v0 + (2 * W) / m)))} m/s` : `${r(v0)} m/s` },
      t_ratio: 0.9,
    });
    push("s7", "motion", "Trajectoire complète",
      { description: `Portée R ≈ ${r(range)} m, temps de vol ≈ ${r(tFlight)} s.`, t_ratio: 1 });
    return steps;
  }

  if (scenario === "free_fall") {
    const h = constants.h ?? 10;
    const t = Math.sqrt((2 * h) / g);
    const v = g * t;
    push("s1", "concept", "Données", { description: `h = ${h} m, g = ${g} m/s²`, t_ratio: 0 });
    push("s2", "diagram", "Bilan : poids seul", { t_ratio: 0 });
    push("s3", "equation", "RFD verticale", { formula: "m a = −m g  ⇒  a = −g", t_ratio: 0.2 });
    push("s4", "substitution", "Cinématique", { formula: "y(t) = h − ½ g t²", t_ratio: 0.5 });
    push("s5", "solve", "Temps de chute & vitesse d'impact", {
      formula: "t = √(2h/g),  v = g·t",
      result: { t: `${r(t)} s`, v: `${r(v)} m/s` },
      t_ratio: 1,
    });
    return steps;
  }

  if (scenario === "inclined_plane") {
    const a0 = constants.alpha ?? constants.theta ?? 30;
    const mu = constants.mu ?? 0;
    const rad = (a0 * Math.PI) / 180;
    const a = g * (Math.sin(rad) - mu * Math.cos(rad));
    push("s1", "concept", "Données", { description: `α = ${a0}°, μ = ${mu}, g = ${g} m/s²`, t_ratio: 0 });
    push("s2", "diagram", "Bilan : P⃗, N⃗" + (mu > 0 ? ", f⃗" : ""), { t_ratio: 0 });
    push("s3", "projection", "Projection sur l'axe de la pente",
      { formula: mu > 0 ? "m a = m g sin α − μ m g cos α" : "m a = m g sin α", projection_target: "bloc", t_ratio: 0.3 });
    push("s4", "solve", "Accélération", {
      formula: mu > 0 ? "a = g(sin α − μ cos α)" : "a = g sin α",
      result: { a: `${r(a)} m/s²` },
      t_ratio: 1,
    });
    return steps;
  }

  if (scenario === "pulley") {
    const m1 = constants.m1 ?? 1, m2 = constants.m2 ?? 2;
    const a = (Math.abs(m2 - m1) * g) / (m1 + m2);
    const T = (2 * m1 * m2 * g) / (m1 + m2);
    push("s1", "concept", "Données", { description: `m₁=${m1} kg, m₂=${m2} kg, g=${g} m/s²`, t_ratio: 0 });
    push("s2", "diagram", "Bilans : P⃗, T⃗ sur chaque masse", { t_ratio: 0 });
    push("s3", "equation", "RFD sur chaque masse", { formula: "m₂g − T = m₂a  ;  T − m₁g = m₁a", t_ratio: 0.3 });
    push("s4", "solve", "Accélération et tension", {
      formula: "a = (m₂−m₁)g/(m₁+m₂),  T = 2m₁m₂g/(m₁+m₂)",
      result: { a: `${r(a)} m/s²`, T: `${r(T)} N` },
      t_ratio: 1,
    });
    return steps;
  }

  if (scenario === "inclined_pulley") {
    const m1 = constants.m1 ?? 2, m2 = constants.m2 ?? 1;
    const alpha = constants.alpha ?? constants.theta ?? 30;
    const mu = constants.mu ?? 0;
    const rad = (alpha * Math.PI) / 180;
    const a = (m2 * g - m1 * g * (Math.sin(rad) + mu * Math.cos(rad))) / (m1 + m2);
    const T = m2 * (g - a);
    push("s1", "concept", "Données", { description: `m₁=${m1}, m₂=${m2}, α=${alpha}°, μ=${mu}`, t_ratio: 0 });
    push("s2", "diagram", "Bilan sur les 2 masses", { t_ratio: 0 });
    push("s3", "equation", "Système couplé par la corde", { formula: "m₂g − T = m₂a ;  T − m₁g sinα − μm₁g cosα = m₁a", t_ratio: 0.4 });
    push("s4", "solve", "Résolution", {
      result: { a: `${r(a)} m/s²`, T: `${r(T)} N` },
      t_ratio: 1,
    });
    return steps;
  }

  if (scenario === "spring") {
    const k = constants.k ?? 200, x = constants.x ?? 0.1, m = constants.m ?? 1;
    const E = 0.5 * k * x * x;
    const T = 2 * Math.PI * Math.sqrt(m / k);
    push("s1", "concept", "Données", { description: `k=${k} N/m, x=${x} m, m=${m} kg`, t_ratio: 0 });
    push("s2", "equation", "Énergie potentielle élastique", { formula: "E_p = ½ k x²", t_ratio: 0.3 });
    push("s3", "equation", "Période d'oscillation", { formula: "T = 2π √(m/k)", t_ratio: 0.6 });
    push("s4", "solve", "Résultats", { result: { E: `${r(E)} J`, T: `${r(T, 3)} s` }, t_ratio: 1 });
    return steps;
  }

  if (scenario === "pendulum") {
    const L = constants.L ?? constants.length ?? 1.5;
    const T = 2 * Math.PI * Math.sqrt(L / g);
    push("s1", "concept", "Données", { description: `L=${L} m, g=${g} m/s²`, t_ratio: 0 });
    push("s2", "equation", "Période pour petites oscillations", { formula: "T = 2π √(L/g)", t_ratio: 0.5 });
    push("s3", "solve", "Calcul", { result: { T: `${r(T, 3)} s` }, t_ratio: 1 });
    return steps;
  }

  if (scenario === "horizontal_motion") {
    const m = constants.m ?? 1, F = constants.F ?? 10, mu = constants.mu ?? 0;
    const a = (F - mu * m * g) / m;
    push("s1", "concept", "Données", { description: `m=${m} kg, F=${F} N, μ=${mu}`, t_ratio: 0 });
    push("s2", "diagram", "Bilan : P⃗, N⃗, F⃗" + (mu > 0 ? ", f⃗" : ""), { t_ratio: 0 });
    push("s3", "equation", "RFD horizontale", { formula: mu > 0 ? "F − μ m g = m a" : "F = m a", t_ratio: 0.4 });
    push("s4", "solve", "Accélération", { result: { a: `${r(a)} m/s²` }, t_ratio: 1 });
    return steps;
  }

  // generic fallback
  push("s1", "concept", "Analyse de l'énoncé", { t_ratio: 0 });
  push("s2", "equation", "Mise en équations", { t_ratio: 0.5 });
  push("s3", "solve", "Résolution", { t_ratio: 1 });
  return steps;
}

// Repair complet : objects + forces + timeline + constants
function repairPlan(json: any, scenario: ScenarioId, extraction: Extraction | null, exercise: string): any {
  if (!json || typeof json !== "object") json = {};
  json.meta = json.meta ?? { domain: "Mécanique", scenario, title: "Exercice de physique" };
  json.constants = json.constants ?? {};
  json.diagram = json.diagram ?? { scenario, params: {}, objects: [], forces: [] };
  const d = json.diagram;
  d.scenario = d.scenario && d.scenario !== "generic" ? d.scenario : scenario;
  d.params = d.params ?? {};
  d.objects = Array.isArray(d.objects) ? d.objects : [];
  d.forces = Array.isArray(d.forces) ? d.forces : [];

  // 1. injecter constants depuis extraction (SI) + regex fallback
  const reg = regexExtract(exercise);
  const inject = (key: string, val: number | undefined) => {
    if (val == null || !Number.isFinite(val)) return;
    if (json.constants[key] == null) json.constants[key] = val;
  };
  inject("g", 9.81);
  inject("m", findExtracted(extraction, "mass") ?? reg.mass);
  inject("v0", findExtracted(extraction, "initial_speed") ?? reg.v0);
  inject("theta", findExtracted(extraction, "angle") ?? reg.theta);
  inject("alpha", json.constants.theta);
  inject("mu", findExtracted(extraction, "friction_coef") ?? reg.mu);
  inject("h", findExtracted(extraction, "height") ?? reg.h);
  inject("L", findExtracted(extraction, "length"));
  inject("k", findExtracted(extraction, "spring_const"));
  inject("F", findExtracted(extraction, "force_value"));
  inject("drag", findExtracted(extraction, "drag_force") ?? reg.drag);
  // travail (peut être négatif, plusieurs valeurs possibles → on prend la première en magnitude max)
  const works = findAllExtracted(extraction, "work");
  const W = works.length ? works.reduce((a, b) => (Math.abs(a) >= Math.abs(b) ? a : b)) : reg.work;
  if (W != null) inject("W", W);

  // Multi-masses
  const masses = findAllExtracted(extraction, "mass");
  if (masses.length >= 2) { inject("m1", masses[0]); inject("m2", masses[1]); }

  // diagram.params : recopier l'essentiel
  const sync = (k: string) => { if (json.constants[k] != null && d.params[k] == null) d.params[k] = json.constants[k]; };
  ["v0", "theta", "alpha", "mu", "h", "h0", "L", "k", "F"].forEach(sync);

  // 2. objects par défaut
  if (d.objects.length === 0) {
    const tpl = DEFAULT_OBJECT_BY_SCENARIO[scenario] ?? DEFAULT_OBJECT_BY_SCENARIO.generic;
    d.objects = tpl.map((o, i) => ({
      ...o,
      mass: (i === 0 ? json.constants.m ?? json.constants.m1 : json.constants.m2) ?? json.constants.m ?? 1,
    }));
  }
  // injecter masse manquante
  d.objects.forEach((o: any, i: number) => {
    if (typeof o.mass !== "number") {
      o.mass = (i === 0 ? json.constants.m1 ?? json.constants.m : json.constants.m2) ?? json.constants.m ?? 1;
    }
  });

  // 3. forces par défaut
  if (d.forces.length === 0) {
    d.forces = defaultForces(scenario, d.objects.map((o: any) => o.id), {
      mu: json.constants.mu, drag: json.constants.drag,
    });
  }
  // virer orphelines
  const ids = new Set(d.objects.map((o: any) => o.id));
  d.forces = d.forces.filter((f: any) => ids.has(f.target));

  // 4. valeurs de params critiques selon scénario
  if (scenario === "projectile") {
    if (typeof d.params.v0 !== "number") d.params.v0 = json.constants.v0 ?? 20;
    if (typeof d.params.theta !== "number") d.params.theta = json.constants.theta ?? 45;
  }
  if (scenario === "inclined_plane" || scenario === "inclined_pulley") {
    if (typeof d.params.angle !== "number") d.params.angle = json.constants.alpha ?? json.constants.theta ?? 30;
    if (typeof d.params.length !== "number") d.params.length = findExtracted(extraction, "length") ?? 4;
  }
  if (scenario === "pendulum") {
    if (typeof d.params.length !== "number") d.params.length = json.constants.L ?? 1.5;
    if (typeof d.params.angle !== "number") d.params.angle = json.constants.theta ?? 20;
  }
  if (scenario === "spring") {
    if (typeof d.params.k !== "number") d.params.k = json.constants.k ?? 200;
  }

  // 5. timeline minimale si vide ou trop courte
  if (!Array.isArray(json.timeline) || json.timeline.length < 3) {
    json.timeline = defaultTimeline(scenario, json.constants);
  } else {
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

    // REPAIR systématique : objects/forces/timeline reconstruits si vides ou incomplets
    result.json = repairPlan(result.json, scenario, extraction, exercise);

    // Revalidation post-repair (informative)
    const finalV = validate(result.json);
    if (!finalV.ok) console.warn("Post-repair validation warnings:", finalV.errors);

    // Annoter avec le provider/modèle utilisé pour le badge UI
    result.json._meta = { provider: result.provider, model: result.model, repaired: !v.ok };

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
