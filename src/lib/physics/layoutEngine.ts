import type { CognitiveJSON, ResolvedScene } from "@/types/cognitive";
import { computeFreeFall } from "./scenarios/freeFall";
import { computeInclinedPlane } from "./scenarios/inclinedPlane";
import { computeProjectile } from "./scenarios/projectile";
import { computePulley } from "./scenarios/pulley";
import { computeSpring } from "./scenarios/spring";
import { computePendulum } from "./scenarios/pendulum";
import { computeHorizontalMotion } from "./scenarios/horizontal";

/**
 * Dispatcher central : prend le JSON cognitif (sémantique) et retourne
 * une scène résolue avec toutes les coordonnées en pixels SVG.
 */
export function computeLayout(data: CognitiveJSON): ResolvedScene {
  const spec = data.diagram;
  const constants = data.constants ?? {};

  switch (spec.scenario) {
    case "free_fall":
      return computeFreeFall(spec, constants);
    case "inclined_plane":
      return computeInclinedPlane(spec, constants);
    case "projectile":
      return computeProjectile(spec, constants);
    case "pulley":
      return computePulley(spec, constants);
    case "spring":
      return computeSpring(spec, constants);
    case "pendulum":
      return computePendulum(spec, constants);
    case "horizontal_motion":
      return computeHorizontalMotion(spec, constants);
    default:
      // Fallback: chute libre par défaut
      return computeFreeFall(spec, constants);
  }
}
