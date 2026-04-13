export interface PhysicsEntity {
  id: string;
  type: string;
  mass?: number;
  initial_position?: number;
  label?: string;
}

export interface TimelineStep {
  id: string;
  type: "concept" | "equation" | "solve" | "vector" | "motion";
  title: string;
  description?: string;
  formula?: string;
  action?: string;
  target?: string;
  direction?: string;
  magnitude?: string;
  result?: Record<string, number>;
  dependencies?: string[];
  visual?: {
    type: string;
    render?: string;
    animate?: boolean;
    direction?: string;
    label?: string;
    color?: string;
  };
}

export interface CognitiveJSON {
  meta: {
    domain: string;
    scenario: string;
    title: string;
  };
  entities: PhysicsEntity[];
  constants: Record<string, number>;
  timeline: TimelineStep[];
}
