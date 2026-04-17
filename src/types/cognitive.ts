// ===== Repère physique (Y-up, mètres) =====
export interface Vec2 {
  x: number;
  y: number;
}

// ===== INPUT SÉMANTIQUE (ce que l'IA produit) =====

export type ScenarioType =
  | "free_fall"
  | "inclined_plane"
  | "pulley"
  | "projectile"
  | "spring"
  | "pendulum"
  | "horizontal_motion"
  | "circuit"
  | "generic";

export type ForceType =
  | "weight"
  | "normal"
  | "friction"
  | "tension"
  | "applied"
  | "spring"
  | "drag"
  | "reaction"
  | "custom";

export interface SemanticObject {
  id: string;
  type: "block" | "ball" | "particle" | "mass";
  label?: string;
  /** masse en kg */
  mass?: number;
  /** id d'ancrage : "ground" | "slope" | "rope_left" | "rope_right" | "spring" | "pivot" */
  anchor?: string;
  /** distance le long de l'ancrage (ex: distance le long du plan incliné) */
  distance?: number;
  /** taille visuelle en mètres (côté du carré) */
  size?: number;
  /** position absolue en mètres (mode generic / projectile) */
  position?: Vec2;
}

export interface SemanticForce {
  id: string;
  target: string; // id de l'objet
  type: ForceType;
  label: string;
  /** expression symbolique (mg, N, T, f, F, kx...) */
  magnitude?: string;
  /** valeur numérique optionnelle (en N) — sinon calculée par le moteur */
  value?: number;
  /** direction explicite pour forces custom (vecteur unitaire physique, Y-up) */
  direction?: Vec2;
  /** orientation pour frottement: "up_slope" | "down_slope" */
  orientation?: string;
  color?: string;
}

export interface DiagramSpec {
  scenario: ScenarioType;
  /** paramètres physiques: angle (deg), length (m), height (m), v0, theta, x (compression), L, etc. */
  params: Record<string, number>;
  objects: SemanticObject[];
  forces: SemanticForce[];
  /** afficher repère xy */
  showAxis?: boolean;
}

// ===== TIMELINE =====

export interface TimelineStep {
  id: string;
  type: "concept" | "equation" | "substitution" | "solve" | "diagram" | "motion";
  title: string;
  description?: string;
  formula?: string;
  result?: Record<string, string | number>;
  dependencies?: string[];
  highlight_elements?: string[];
  highlight_forces?: string[];
}

export interface CognitiveJSON {
  meta: {
    domain: string;
    scenario: string;
    title: string;
  };
  entities?: Array<{
    id: string;
    type: string;
    label: string;
    properties: Record<string, number | string>;
  }>;
  constants: Record<string, number>;
  diagram: DiagramSpec;
  timeline: TimelineStep[];
}

// ===== OUTPUT RÉSOLU (ce que reçoit le renderer, en pixels SVG) =====

export interface ResolvedElement {
  id: string;
  type:
    | "ground"
    | "slope"
    | "wall"
    | "block"
    | "ball"
    | "spring"
    | "rope"
    | "pulley"
    | "axis"
    | "projectile_path"
    | "pendulum_arm"
    | "angle_arc"
    | "dimension";
  /** coords SVG (px, Y-down) */
  position: Vec2;
  /** point cible (pour ligne, corde, axe...) */
  end?: Vec2;
  /** taille en pixels */
  size?: { w: number; h: number };
  rotationDeg?: number;
  label?: string;
  meta?: Record<string, number | string | boolean>;
}

export interface ResolvedForce {
  id: string;
  label: string;
  magnitude?: string;
  /** start/end en coords SVG (px) */
  start: Vec2;
  end: Vec2;
  color: string;
  type: ForceType;
  target: string;
}

export interface ResolvedScene {
  width: number;
  height: number;
  elements: ResolvedElement[];
  forces: ResolvedForce[];
  /** map id objet -> centre SVG (utile aux highlights) */
  objectCenters: Record<string, Vec2>;
}
