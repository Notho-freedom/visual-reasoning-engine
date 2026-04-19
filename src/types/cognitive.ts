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
  | "inclined_pulley"
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
  mass?: number;
  anchor?: string;
  distance?: number;
  size?: number;
  position?: Vec2;
}

export interface SemanticForce {
  id: string;
  target: string;
  type: ForceType;
  label: string;
  magnitude?: string;
  value?: number;
  direction?: Vec2;
  orientation?: string;
  color?: string;
  phase?: "pre" | "post" | "always";
}

export interface CircuitComponent {
  id: string;
  type: "battery" | "resistor" | "capacitor" | "wire";
  label?: string;
  value?: number;
  unit?: string;
}

export interface DiagramSpec {
  scenario: ScenarioType;
  params: Record<string, number>;
  objects: SemanticObject[];
  forces: SemanticForce[];
  showAxis?: boolean;
  animation?: { duration?: number; autoplay?: boolean };
  /** Pour scénario "circuit" : composants ordonnés autour de la boucle. */
  circuit?: CircuitComponent[];
}

// ===== TIMELINE =====

export interface TimelineStep {
  id: string;
  type: "concept" | "equation" | "substitution" | "solve" | "diagram" | "motion" | "projection";
  title: string;
  description?: string;
  formula?: string;
  result?: Record<string, string | number>;
  dependencies?: string[];
  highlight_elements?: string[];
  highlight_forces?: string[];
  /** Position temporelle dans l'animation, 0..1. */
  t_ratio?: number;
  /** Objet cible pour la projection (id). */
  projection_target?: string;
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

// ===== ANIMATION =====

export interface AnimationFrame {
  t: number;
  duration: number;
  progress: number;
}

// ===== OUTPUT RÉSOLU =====

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
    | "world_axis"
    | "local_axis"
    | "projectile_path"
    | "pendulum_arm"
    | "angle_arc"
    | "dimension"
    | "trail"
    | "wire"
    | "resistor"
    | "capacitor"
    | "battery"
    | "current_flow";
  position: Vec2;
  end?: Vec2;
  size?: { w: number; h: number };
  rotationDeg?: number;
  label?: string;
  meta?: Record<string, number | string | boolean>;
}

export interface ResolvedForce {
  id: string;
  label: string;
  magnitude?: string;
  start: Vec2;
  end: Vec2;
  color: string;
  type: ForceType;
  target: string;
  faded?: boolean;
}

export interface ResolvedScene {
  width: number;
  height: number;
  elements: ResolvedElement[];
  forces: ResolvedForce[];
  objectCenters: Record<string, Vec2>;
  /** rotation locale par objet (degrés, sens horaire SVG) — utile pour projections */
  objectLocalRotations?: Record<string, number>;
  duration?: number;
  phaseLabel?: string;
}
