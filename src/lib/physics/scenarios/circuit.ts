import type { DiagramSpec, ResolvedScene, ResolvedElement, AnimationFrame } from "@/types/cognitive";

/**
 * Circuit en boucle rectangulaire avec composants placés régulièrement.
 * Animation : points de courant qui circulent.
 */
export function computeCircuit(spec: DiagramSpec, _constants: Record<string, number>, frame: AnimationFrame): ResolvedScene {
  const W = 1000;
  const H = 600;

  const elements: ResolvedElement[] = [];

  // Boucle rectangulaire
  const left = 200;
  const right = 800;
  const top = 150;
  const bottom = 450;

  const components = spec.circuit ?? [];
  // Si vide, fallback : batterie + 1 résistance
  const list = components.length > 0 ? components : [
    { id: "bat", type: "battery" as const, label: "E" },
    { id: "R", type: "resistor" as const, label: "R" },
  ];

  // 4 segments : haut (gauche→droite), droite (haut→bas), bas (droite→gauche), gauche (bas→haut)
  // On distribue les composants le long du périmètre.
  const segments: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }> = [
    { start: { x: left, y: top }, end: { x: right, y: top } },        // haut
    { start: { x: right, y: top }, end: { x: right, y: bottom } },    // droite
    { start: { x: right, y: bottom }, end: { x: left, y: bottom } },  // bas
    { start: { x: left, y: bottom }, end: { x: left, y: top } },      // gauche
  ];

  // Wires (segments complets en fond)
  segments.forEach((s, i) => {
    elements.push({
      id: `wire_${i}`,
      type: "wire",
      position: s.start,
      end: s.end,
    });
  });

  // Place les composants à des positions équiréparties sur le périmètre
  const segmentLengths = segments.map(s => Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y));
  const perimeter = segmentLengths.reduce((a, b) => a + b, 0);

  list.forEach((comp, i) => {
    // Position cumulée : on évite le coin (0) et on espace
    const cumul = ((i + 0.5) / list.length) * perimeter;
    let acc = 0;
    let segIdx = 0;
    let local = cumul;
    for (let j = 0; j < segments.length; j++) {
      if (acc + segmentLengths[j] >= cumul) {
        segIdx = j;
        local = cumul - acc;
        break;
      }
      acc += segmentLengths[j];
    }
    const seg = segments[segIdx];
    const tt = local / segmentLengths[segIdx];
    const px = seg.start.x + (seg.end.x - seg.start.x) * tt;
    const py = seg.start.y + (seg.end.y - seg.start.y) * tt;

    const isHorizontal = segIdx === 0 || segIdx === 2;

    let type: any = comp.type;
    if (type === "wire") return; // les fils sont déjà en fond

    elements.push({
      id: comp.id,
      type,
      position: { x: px, y: py },
      size: { w: 60, h: 30 },
      rotationDeg: isHorizontal ? 0 : 90,
      label: comp.value != null ? `${comp.label ?? comp.id} = ${comp.value}${comp.unit ?? ""}` : comp.label ?? comp.id,
    });
  });

  // Animation du courant : 12 points lumineux espacés régulièrement, qui avancent
  const N_POINTS = 14;
  const speed = 220; // px/s
  const offset = (frame.t * speed) % perimeter;

  for (let i = 0; i < N_POINTS; i++) {
    const dist = (offset + (i / N_POINTS) * perimeter) % perimeter;
    let acc = 0;
    let segIdx = 0;
    let local = dist;
    for (let j = 0; j < segments.length; j++) {
      if (acc + segmentLengths[j] >= dist) {
        segIdx = j;
        local = dist - acc;
        break;
      }
      acc += segmentLengths[j];
    }
    const seg = segments[segIdx];
    const tt = local / segmentLengths[segIdx];
    const px = seg.start.x + (seg.end.x - seg.start.x) * tt;
    const py = seg.start.y + (seg.end.y - seg.start.y) * tt;

    elements.push({
      id: `current_${i}`,
      type: "current_flow",
      position: { x: px, y: py },
      meta: { intensity: 1 },
    });
  }

  // Repère monde fixe
  elements.push({
    id: "world_axis",
    type: "world_axis",
    position: { x: 50, y: H - 40 },
    size: { w: 70, h: 70 },
    meta: { scalePxPerM: 60 },
  });

  return {
    width: W,
    height: H,
    elements,
    forces: [],
    objectCenters: {},
    phaseLabel: `Courant en circulation — t = ${frame.t.toFixed(2)} s`,
  };
}
