export interface PhysicsEntity {
  id: string;
  type: string;
  label: string;
  properties: Record<string, number | string>;
  position?: { x: number; y: number };
  connections?: string[];
}

export interface DiagramElement {
  id: string;
  type: "ground" | "slope" | "object" | "spring" | "rope" | "pulley" | "wall" | "axis" | "wire" | "resistor" | "capacitor" | "battery" | "switch" | "projectile_path";
  position: { x: number; y: number };
  rotation?: number;
  dimensions?: { width: number; height: number };
  label?: string;
  style?: {
    color?: string;
    strokeWidth?: number;
    dashed?: boolean;
    fill?: string;
  };
  properties?: Record<string, number | string>;
}

export interface Force {
  id: string;
  label: string;
  target: string;
  application_point: { x: number; y: number };
  direction: { x: number; y: number };
  magnitude: string;
  color?: string;
}

export interface Diagram {
  type: string;
  width: number;
  height: number;
  elements: DiagramElement[];
  forces: Force[];
}

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
  entities: PhysicsEntity[];
  constants: Record<string, number>;
  diagram: Diagram;
  timeline: TimelineStep[];
}
