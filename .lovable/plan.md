

## Diagnostic des problèmes signalés

1. **Repère global qui "bouge"** : `makeWorldAxis(vp)` utilise `vp.originX/originY` qui change par scénario → le repère se déplace selon où le solveur place son origine physique. Il faut un repère monde **fixe** en bas-gauche du canvas (ex. `x=30, y=H-30`), indépendant du viewport.

2. **Plan incliné — le bloc "monte" puis retombe** : dans `inclinedPlane.ts`, `dStart` vient de `obj.distance` (donné par l'IA, souvent 2.5) mais `sParcouru = ½·a·t²` peut dépasser largement → `dRestant = max(0, ...)` fait sauter le bloc à 0 brutalement. Pire : la durée par défaut est calculée pour `L=5` alors que `dStart=2.5` → le bloc atteint le bas bien avant la fin de l'animation et reste figé. Il faut **caler la durée sur `dStart` réel** et clamper proprement.

3. **Ressort — le bloc ne touche pas le sol** : dans `computeSpring`, le bloc est centré sur `y=0` mais le sol est à `y=-0.5`. Le bloc flotte de 0.5m au-dessus. Il faut **placer le centre du bloc à `y = sizeM/2`** (pour que sa face inférieure touche le sol à `y=0`) et placer le sol à `y=0`.

4. **Systèmes combinés non compris** : le prompt IA n'a aucun exemple de "plan incliné + poulie + masse suspendue" ni de scénario `combined`. L'IA tombe forcément sur `inclined_plane` ou `pulley` seul. Il faut introduire un nouveau scénario `inclined_pulley` (et un solveur dédié) + l'enseigner explicitement à l'IA avec l'énoncé exact donné en exemple.

5. **Sync timeline ↔ animation** : aucun champ temporel sur les `TimelineStep`. Il faut ajouter `t_anchor?: number` (ou `t_ratio?: 0..1`) → clic sur étape = saute à `t`, et inversement l'étape active suit `t` courant.

6. **Décomposition projetée des forces** : sur étape de type `projection` (nouveau) ou si `step.type === "equation"` avec axe local visible → dessiner pour chaque force highlighted ses composantes Px'/Py' en pointillés sur le repère local.

7. **Circuits électriques** : nouveau scénario `circuit` avec layout en boucle rectangulaire (générateur, R, C, fils) + animation de points lumineux qui circulent.

---

## Plan d'implémentation

### A. Corrections critiques (priorité 1)

**A1. Repère monde vraiment fixe**
- `makeWorldAxis` : ignore `vp.originX/originY`. Utilise `{ x: 30, y: H - 30 }` (constante canvas).
- Ajouter `width/height` du canvas au paramètre. Le repère monde est toujours en bas-gauche du **SVG**, pas du repère physique.

**A2. Plan incliné — animation correcte**
- Recaler `dStart` à `slopeLen - 0.5` systématiquement (ignorer ou saturer `obj.distance`).
- Forcer la durée animation : `duration = sqrt(2·dStart/a)` exactement.
- Clamper `dRestant` entre `[0.3, dStart]` pour ne jamais sortir.

**A3. Ressort — bloc collé au sol**
- Sol à `y=0`, centre du bloc à `y = sizeM/2`. Le ressort va du mur au bord gauche du bloc, à hauteur `y = sizeM/2`.
- Idem pour `horizontal_motion` : vérifier que le bloc touche le sol.

### B. Systèmes combinés (priorité 1)

**B1. Nouveau scénario `inclined_pulley`**
- Solveur `src/lib/physics/scenarios/inclinedPulley.ts` qui dessine :
  - Plan incliné à gauche avec bloc m₁ dessus
  - Poulie au sommet du plan
  - Corde du bloc → poulie → masse m₂ pendue verticalement à droite
- Calcul correct : `a = (m₂g - m₁g·sinα - μ·m₁g·cosα) / (m₁+m₂)` (signé selon sens du mouvement)
- Animation : m₁ glisse sur la pente, m₂ monte/descend en synchro, corde reste de longueur constante
- Forces sur m₁ : P, N, T, f (frottement opposé au sens réel du mouvement)
- Forces sur m₂ : P, T

**B2. Ajouter au type `ScenarioType`** : `"inclined_pulley"`.

**B3. Étendre le prompt IA**
- Ajouter un exemple complet `inclined_pulley` avec exactement l'énoncé donné par l'utilisateur (bloc 2kg sur plan 30° + corde + poulie + masse 1kg + μ=0.2).
- Liste explicite des **systèmes combinés** détectables : `inclined_pulley`, `double_pulley` (Atwood asymétrique), `spring_inclined` (plus tard).
- Règle de décision claire : "si l'énoncé mentionne 2+ objets reliés → scénario combiné, jamais simple".
- Passer le modèle à `google/gemini-2.5-pro` pour les énoncés complexes (meilleur reasoning).

### C. Sync timeline ↔ animation (priorité 2)

**C1. Étendre `TimelineStep`**
- Ajouter `t_ratio?: number` (0..1) : à quel moment de l'animation l'étape se réfère.
- L'IA renseigne ces ancres (ex. "à l'impact" → `t_ratio: 1`, "moment initial" → `t_ratio: 0`, "à mi-chute" → `t_ratio: 0.5`).

**C2. Logique dans `Index.tsx`**
- Clic sur étape `i` → si `step.t_ratio != null` → `setT(step.t_ratio * scene.duration)`.
- Pendant la lecture : déduire l'étape active du `t` courant en cherchant la dernière étape avec `t_ratio ≤ t/duration`. La sélectionner automatiquement.
- Mode "verrouillé" si user scrub manuellement (toggle simple : "suivre l'animation" ON/OFF).

### D. Décomposition projetée des forces (priorité 2)

**D1. Nouveau type d'étape** : `"projection"` dans `TimelineStep.type`.

**D2. Logique de rendu**
- Si `step.type === "projection"` et l'objet ciblé a un repère local de rotation `θ` → pour chaque force highlighted :
  - Calculer composantes le long de x' et y' du repère local (rotation inverse).
  - Dessiner deux flèches en **pointillés** dans la couleur de la force, plus fines, avec labels `Px'`, `Py'`.
- Composant `ForceProjectionRenderer` qui prend `{ force, localRotationDeg, originPx }`.

### E. Circuits électriques (priorité 3, simple)

**E1. Solveur `circuit.ts`**
- Layout rectangulaire fixe (boucle). L'IA fournit liste ordonnée : `["battery", "R", "wire", "C", "wire"]`.
- Placement automatique en grille rectangulaire (4 segments : haut, droite, bas, gauche).
- Composants déjà dispos : `BatteryRenderer`, `ResistorRenderer`, `CapacitorRenderer`, `WireRenderer`.

**E2. Animation courant**
- Des points lumineux (cercles) qui se déplacent le long du périmètre de la boucle à vitesse `v ∝ I`.
- Position des points : paramétrisation par longueur cumulée du périmètre, mod L, avancement = `t · v`.

**E3. Ajout exemple circuit dans le prompt IA**.

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/lib/physics/coords.ts` | `makeWorldAxis` ignore vp, utilise coin canvas fixe |
| `src/lib/physics/scenarios/inclinedPlane.ts` | Fix `dStart`/durée, clamping correct |
| `src/lib/physics/scenarios/spring.ts` | Bloc touche le sol |
| `src/lib/physics/scenarios/horizontal.ts` | Bloc touche le sol (vérif) |
| `src/lib/physics/scenarios/inclinedPulley.ts` | NOUVEAU — solveur combiné |
| `src/lib/physics/scenarios/circuit.ts` | NOUVEAU — boucle + courant animé |
| `src/lib/physics/layoutEngine.ts` | Dispatcher: ajouter `inclined_pulley`, `circuit` |
| `src/lib/physics/animation.ts` | `defaultDuration` pour nouveaux scénarios |
| `src/types/cognitive.ts` | `ScenarioType` étendu, `TimelineStep.t_ratio`, type `"projection"` |
| `src/components/renderers/ForceProjectionRenderer.tsx` | NOUVEAU — composantes pointillées |
| `src/components/renderers/CurrentFlowRenderer.tsx` | NOUVEAU — points lumineux en boucle |
| `src/components/SceneRenderer.tsx` | Branche les 2 nouveaux renderers + projection si `step.type==="projection"` |
| `src/pages/Index.tsx` | Sync clic-étape → t, sync t → étape active, toggle "suivre" |
| `supabase/functions/parse-exercise/index.ts` | Modèle `gemini-2.5-pro`, prompt enrichi (systèmes combinés + circuits + `t_ratio`), schema étendu |

---

## Scope cette itération

- **Priorité haute** : fixes (repère monde fixe, plan incliné, ressort touche sol) + scénario `inclined_pulley` + amélioration prompt IA pour systèmes combinés (l'énoncé exact donné doit marcher parfaitement).
- **Priorité moyenne** : sync timeline ↔ animation + projection forces sur repère local.
- **Priorité basse** : circuits électriques basiques (R + batterie + boucle, sans Kirchhoff complexe).

Hors scope : OCR image, double pendule, RLC complets, mode hypothèse comparatif.

