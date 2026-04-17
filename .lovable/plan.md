

## Diagnostic

L'utilisateur a raison : actuellement le pipeline est `JSON → SVG direct`. L'IA place des coordonnées approximatives (`position: {x: 200, y: 300}`), les forces sont attachées visuellement et non calculées. Résultat : ça ressemble à de la physique, mais ce n'est pas géométriquement exact.

## Solution : Physics Layout Engine

Insérer une couche de calcul entre le JSON brut et le rendu SVG :

```text
JSON (sémantique) → computeLayout() → JSON (résolu) → Renderer (bête)
```

L'IA décrit la **scène en termes physiques** (angle, distance, masse), pas en pixels. Le moteur de layout calcule les positions exactes, les vecteurs réels, et passe au renderer un JSON où tout est déjà en coordonnées correctes.

---

## 1. Nouveau format JSON sémantique

L'IA ne donne plus `position: {x: 250, y: 400}` mais une description physique :

```json
{
  "diagram": {
    "scenario": "inclined_plane",
    "params": { "angle": 30, "length": 4, "blockSize": 0.5 },
    "objects": [
      { "id": "block", "type": "block", "anchor": "slope", "distance": 2, "mass": 5 }
    ],
    "forces": [
      { "id": "P", "target": "block", "type": "weight", "magnitude": "mg" },
      { "id": "N", "target": "block", "type": "normal", "magnitude": "N" },
      { "id": "f", "target": "block", "type": "friction", "magnitude": "f", "direction": "up_slope" }
    ]
  }
}
```

Plus de coordonnées pixel dans le JSON IA. Que de la physique.

## 2. Module `src/lib/physics/layoutEngine.ts`

Cœur du système. Pour chaque scénario, une fonction de résolution :

- `computeInclinedPlane(params)` → calcule positions du sol, de la pente, du bloc (`x = d·cos(α), y = d·sin(α)`), point d'application des forces (centre du bloc).
- `computeFreeFall(params)` → position verticale, vecteur poids depuis le centre.
- `computePulley(params)` → position de la poulie, des deux blocs, tension le long des cordes.
- `computeProjectile(params)` → trajectoire paramétrée, position de tir.
- `computeSpring(params)` → ancrage mur + position bloc selon compression.
- `computePendulum(params)` → pivot + position masse selon angle.
- `computeCircuit(params)` → placement automatique des composants en boucle.

Chaque fonction retourne :
```ts
{
  elements: DiagramElement[],   // avec positions PIXEL exactes
  forces: ResolvedForce[],      // avec start/end calculés
  bounds: { width, height }
}
```

## 3. Système de coordonnées

- **Repère physique** : origine en bas-gauche, y vers le haut, unités en mètres.
- **Repère SVG** : origine en haut-gauche, y vers le bas, unités en pixels.
- Fonction `toSVG(point, scale, viewport)` qui fait la conversion à la toute fin.
- Échelle vectorielle dédiée pour les forces (`forceScale = 30 px/N`) pour éviter les flèches géantes avec g=9.81.

## 4. Calcul vectoriel des forces

Dans `src/lib/physics/forces.ts`, fonctions pures :

```ts
weight(mass, g) → { x: 0, y: -mass*g }
normal(mass, g, angle) → { x: -sin(α)*N, y: cos(α)*N }
friction(N, μ, angle, direction) → vecteur le long du plan
tension(magnitude, ropeAngle) → vecteur le long de la corde
```

Toutes les forces partent du **centre de masse réel** de l'objet, calculé par le layout engine.

## 5. Renderer "bête"

`SceneRenderer` et tous les renderers individuels deviennent passifs : ils reçoivent des coordonnées déjà calculées et dessinent. Aucune logique géométrique côté rendu.

`VectorRenderer` reçoit `{ start: {x,y}, end: {x,y}, label }` directement — fini le calcul de direction normalisée dans le renderer.

## 6. Mise à jour de l'edge function

Le prompt IA est simplifié : on lui demande de décrire la scène en **paramètres physiques** (`scenario`, `angle`, `mass`, `length`), pas en coordonnées. Le tool schema reflète ce nouveau format.

L'IA produit moins de données, plus sémantiques → moins d'erreurs de placement.

## 7. Pipeline dans `Index.tsx`

```ts
const aiResult = await parseExercise(text);
const resolvedScene = computeLayout(aiResult);  // ← nouvelle étape
setData({ ...aiResult, diagram: resolvedScene });
```

## 8. Constraint system (bonus, scope V2.1)

Pour rester dans les clous de cette itération, on implémente seulement les contraintes implicites dans chaque solveur de scénario (bloc collé au plan, masse au bout de la corde). Un vrai système de contraintes générique vient après.

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/lib/physics/layoutEngine.ts` | NOUVEAU — dispatcher de scénarios |
| `src/lib/physics/scenarios/*.ts` | NOUVEAU — un solveur par type (incliné, poulie, projectile, ressort, pendule, chute, circuit) |
| `src/lib/physics/forces.ts` | NOUVEAU — calcul vectoriel des forces |
| `src/lib/physics/coords.ts` | NOUVEAU — conversion repère physique ↔ SVG |
| `src/types/cognitive.ts` | Ajout `ResolvedForce`, `DiagramSpec` (input sémantique) |
| `supabase/functions/parse-exercise/index.ts` | Prompt + schema sémantique |
| `src/pages/Index.tsx` | Appel `computeLayout()` après parsing |
| `src/components/SceneRenderer.tsx` | Devient passif |
| `src/components/renderers/VectorRenderer.tsx` | Reçoit start/end précalculés |

## Scope itération

**Mécanique d'abord** : chute libre, plan incliné, poulie, projectile, ressort, pendule. Solveurs exacts pour chacun.
**Électricité après** : layout automatique de circuits (placement en grille).

