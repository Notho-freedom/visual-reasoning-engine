
# Précision absolue des schémas — refonte du pipeline d'interprétation

Objectif : que chaque schéma soit la traduction fidèle de l'énoncé, sans paramètre oublié, sans confusion de scénario, sans incohérence physique. Plus jamais un bloc qui flotte, un angle inversé, une force manquante ou une masse à la mauvaise place.

## 1. Pipeline en 2 passes (edge function `parse-exercise`)

```text
Énoncé FR
   │
   ▼
[Passe 1 — EXTRACTEUR]            (modèle rapide + raisonnement structuré)
   │  → parameters[] (nom, valeur, unité, rôle)
   │  → entities[]   (objets, supports, liaisons)
   │  → keywords[]   (mots déclencheurs scénario)
   │  → question     (ce qu'on demande)
   ▼
[Heuristique déterministe TS]
   │  → scenario candidat + score de confiance
   │  → params normalisés (SI : m, kg, °, m/s, N…)
   ▼
[Passe 2 — CONSTRUCTEUR]          (modèle raisonneur, JSON cognitif final)
   │  reçoit : énoncé + extraction + scénario suggéré
   │  produit : DiagramSpec + timeline complète
   ▼
[Validateur Zod + règles physiques]
   │  ✓ ok  → renvoie au front
   │  ✗ ko  → AUTO-RETRY SILENCIEUX (1×) avec liste d'erreurs en feedback
   ▼
JSON cognitif livré
```

- Passe 1 : `google/gemini-3-flash-preview` (rapide, cheap, JSON-tool).
- Passe 2 : `google/gemini-2.5-pro` conservé (déjà solide en raisonnement physique structuré).
- Auto-retry silencieux unique en cas d'échec de validation, avec les erreurs renvoyées dans le prompt de la 2e tentative. Si toujours invalide → fallback sur les corrections locales (valeurs par défaut sûres) + log.

## 2. Extraction exhaustive des paramètres

Passe 1 retourne un tableau typé `parameters` :

```ts
{ symbol: "α", value: 30, unit: "deg",  role: "angle"  }
{ symbol: "m", value: 2,  unit: "kg",   role: "mass"   }
{ symbol: "μ", value: 0.2,unit: "",     role: "friction_coef" }
{ symbol: "v0",value: 20, unit: "m/s",  role: "initial_speed" }
{ symbol: "h", value: 15, unit: "m",    role: "height" }
{ symbol: "k", value: 80, unit: "N/m",  role: "spring_const" }
{ symbol: "L", value: 1.2,unit: "m",    role: "length" }
{ symbol: "R", value: 100,unit: "Ω",    role: "resistance" }
```

- Conversion SI systématique côté serveur (cm→m, g→kg, km/h→m/s, °→°, mN→N…).
- Aucun nombre de l'énoncé n'est ignoré : tout passe dans `constants` ; les rôles connus alimentent `diagram.params`.
- Détection de la **question posée** (ce que l'élève doit calculer) → utilisée pour orienter la timeline (étapes `solve` ciblant les bonnes inconnues).

## 3. Détection de scénario plus fiable

Pré-classifieur déterministe en TypeScript (mots-clés FR + combinaisons), exécuté entre passe 1 et passe 2 :

| Signal détecté | Scénario imposé |
|---|---|
| 2 masses + corde/poulie + plan incliné | `inclined_pulley` |
| 2 masses + corde/poulie seuls | `pulley` |
| ressort + vertical/suspendu | `spring` (variante verticale) |
| ressort + horizontal/table | `spring` |
| projectile + "horizontalement" + hauteur | `projectile` (tir horizontal) |
| projectile + angle θ | `projectile` (tir oblique) |
| pendule / oscille / fil | `pendulum` |
| circuit + (R, C, batterie) | `circuit` |
| chute / lâché / sans vitesse initiale | `free_fall` |
| force horizontale + table/sol | `horizontal_motion` |
| plan incliné seul (1 objet) | `inclined_plane` |

Le scénario suggéré est passé à la passe 2 comme **contrainte forte** ("scenario must be X unless impossible"). Évite les régressions classiques : plan incliné simple confondu avec poulie inclinée, ressort vertical traité comme horizontal, projectile horizontal traité comme oblique à 0°.

## 4. Validation & auto-correction (Zod + règles physiques)

Côté edge function ET côté front, avant rendu :

Schéma Zod strict :
- `forces[].target` doit exister dans `objects[]`.
- Champs requis selon `scenario` :
  - `inclined_plane` / `inclined_pulley` → `params.angle`, `params.length`.
  - `projectile` → `params.v0`, (`params.theta` ou tir horizontal).
  - `spring` → `params.k`, `params.x` ou `L`.
  - `pendulum` → `params.length`, `params.angle`.
  - `circuit` → `circuit[]` non vide.
- Plages plausibles (angle ∈ [0°, 90°], masse > 0, μ ∈ [0, 2], etc.).
- Cohérence : si scénario = `inclined_pulley`, exactement 2 objets et au moins 1 force `tension` par objet.
- `timeline` non vide, chaque étape a `t_ratio` ∈ [0, 1] et `projection` a `projection_target` valide.

Si KO → auto-retry silencieux unique avec les erreurs listées au modèle. Si toujours KO → patch local (valeurs par défaut documentées) + toast discret seulement si la physique est gravement cassée.

## 5. Nouveaux scénarios / variantes fines

Ajouts ciblés au moteur (`src/lib/physics/scenarios/`) :

- **Ressort vertical** (variante de `spring`) : masse suspendue, gravité prise en compte, équilibre statique + oscillation.
- **Plan incliné avec force appliquée** : ajout d'un `applied` orienté (parallèle à la pente, horizontal, ou direction libre).
- **Projectile depuis une hauteur** : départ à `(0, h0)`, support visible, portée mesurée au sol.
- **Projectile horizontal** (tir tendu) : θ = 0, hauteur initiale obligatoire.
- **Deux blocs empilés** (`stacked_blocks`) : frottement entre les deux + frottement avec le sol.
- **Pendule conique** (option) : mouvement circulaire horizontal — phase 2 si demandé.

Chaque nouveau scénario : ajouté à l'enum `ScenarioType`, exemple JSON dans le system prompt, computeur dans `layoutEngine.ts`.

## 6. Améliorations rendu (précision visuelle)

- Angles : toujours marqués avec arc + label (`α=30°`), même côté correct (sommet réel du triangle).
- Cotes (`dimension`) automatiques : longueur de pente, hauteur de chute, distance ressort, longueur pendule.
- Repère local toujours aligné sur la géométrie réelle (pente, corde, tangente).
- Masses : taille proportionnelle à `mass^(1/3)` (clamp min/max) pour visualiser la différence m₁/m₂.
- Étiquettes des forces non superposées (offset perpendiculaire automatique si collision).

## 7. Détails techniques

Fichiers touchés :
- `supabase/functions/parse-exercise/index.ts` — refonte en 2 passes, system prompts revus, retry logic.
- `supabase/functions/parse-exercise/extractor.ts` (nouveau) — passe 1 + heuristique scénario.
- `supabase/functions/parse-exercise/validator.ts` (nouveau) — Zod schema partagé via copie.
- `src/lib/validation/cognitiveSchema.ts` (nouveau) — validation côté front avant rendu.
- `src/lib/physics/scenarios/spring.ts` — variante verticale.
- `src/lib/physics/scenarios/projectile.ts` — départ depuis hauteur, tir horizontal.
- `src/lib/physics/scenarios/inclinedPlane.ts` — support force appliquée.
- `src/lib/physics/scenarios/stackedBlocks.ts` (nouveau).
- `src/lib/physics/layoutEngine.ts` — wiring des nouveaux scénarios.
- `src/types/cognitive.ts` — nouveaux scenarios + champs (`initialHeight`, `appliedForceDir`, etc.).
- `src/components/SceneRenderer.tsx` — anti-collision labels de forces, cotes auto.

Modèles AI :
- Passe 1 : `google/gemini-3-flash-preview`.
- Passe 2 : `google/gemini-2.5-pro`.
- 1 retry silencieux max sur passe 2.

Pas de changement de schéma BDD (pas de BDD).

## 8. Hors-scope (pour rester focalisé)

- Pas de refonte UI ni de nouveaux panneaux.
- Pas de changement du player d'animation.
- Pas de nouveaux raccourcis clavier.
- Pas de persistence cloud des analyses.

## Critère de succès

Sur un set de ~10 énoncés tests (chute, plan incliné simple, plan incliné + poulie, pendule, ressort horizontal, ressort vertical, projectile oblique, projectile horizontal, circuit RC, mouvement horizontal avec frottement) :
- 100 % des paramètres numériques de l'énoncé apparaissent dans `constants`.
- Scénario correct pour chaque énoncé (pas de simple confondu avec combiné).
- Aucun rendu cassé (forces qui ciblent un objet inexistant, masse qui flotte, angle inversé).
