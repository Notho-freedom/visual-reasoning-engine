import type { CognitiveJSON } from "@/types/cognitive";

export interface ValidationReport {
  ok: boolean;
  warnings: string[];
}

/**
 * Vérification légère côté front. Ne bloque jamais le rendu : retourne uniquement
 * des warnings + applique des patches in-place pour éviter les crashs visuels.
 */
export function validateAndPatch(json: CognitiveJSON | null | undefined): ValidationReport {
  const warnings: string[] = [];
  if (!json) return { ok: false, warnings: ["JSON manquant"] };

  const d = json.diagram;
  if (!d) {
    warnings.push("diagram manquant");
    return { ok: false, warnings };
  }

  const objIds = new Set(d.objects?.map((o) => o.id) ?? []);

  // Filtre des forces orphelines
  const before = d.forces?.length ?? 0;
  d.forces = (d.forces ?? []).filter((f) => {
    if (!objIds.has(f.target)) {
      warnings.push(`Force '${f.id}' supprimée (target '${f.target}' inexistant)`);
      return false;
    }
    return true;
  });
  if (d.forces.length !== before && d.forces.length === 0) warnings.push("Toutes les forces orphelines retirées");

  // Plages des params
  const p = d.params ?? {};
  if (typeof p.angle === "number" && (p.angle <= 0 || p.angle >= 90)) {
    warnings.push(`angle hors plage : ${p.angle}° (clampé)`);
    p.angle = Math.min(85, Math.max(5, p.angle));
  }
  d.params = p;

  // Timeline : t_ratio
  json.timeline = (json.timeline ?? []).map((s) => ({
    ...s,
    t_ratio: typeof s.t_ratio === "number"
      ? Math.max(0, Math.min(1, s.t_ratio))
      : 0,
  }));

  return { ok: warnings.length === 0, warnings };
}
