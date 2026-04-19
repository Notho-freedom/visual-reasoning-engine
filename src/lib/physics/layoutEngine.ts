import type { CognitiveJSON, ResolvedScene, AnimationFrame } from "@/types/cognitive";
import { computeFreeFall } from "./scenarios/freeFall";
import { computeInclinedPlane } from "./scenarios/inclinedPlane";
import { computeProjectile } from "./scenarios/projectile";
import { computePulley } from "./scenarios/pulley";
import { computeSpring } from "./scenarios/spring";
import { computePendulum } from "./scenarios/pendulum";
import { computeHorizontalMotion } from "./scenarios/horizontal";
import { computeInclinedPulley } from "./scenarios/inclinedPulley";
import { computeCircuit } from "./scenarios/circuit";
import { defaultDuration, makeFrame } from "./animation";

export function computeLayout(data: CognitiveJSON, t: number = 0): ResolvedScene {
  const spec = data.diagram;
  const constants = data.constants ?? {};
  const duration = spec.animation?.duration ?? defaultDuration(spec.scenario, spec.params, constants);
  const frame: AnimationFrame = makeFrame(t, duration);

  let scene: ResolvedScene;
  switch (spec.scenario) {
    case "free_fall": scene = computeFreeFall(spec, constants, frame); break;
    case "inclined_plane": scene = computeInclinedPlane(spec, constants, frame); break;
    case "inclined_pulley": scene = computeInclinedPulley(spec, constants, frame); break;
    case "projectile": scene = computeProjectile(spec, constants, frame); break;
    case "pulley": scene = computePulley(spec, constants, frame); break;
    case "spring": scene = computeSpring(spec, constants, frame); break;
    case "pendulum": scene = computePendulum(spec, constants, frame); break;
    case "horizontal_motion": scene = computeHorizontalMotion(spec, constants, frame); break;
    case "circuit": scene = computeCircuit(spec, constants, frame); break;
    default: scene = computeFreeFall(spec, constants, frame);
  }
  scene.duration = duration;
  return scene;
}
