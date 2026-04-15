

# PhysicsEngine V2 — Refonte totale

## Problemes identifies

1. **Design "crachat d'IA"** : neon partout, emojis, glow excessif, zero personnalite
2. **Hardcode chute libre** : le canvas, les controles, le prompt IA, les types — tout est cable sur un seul scenario
3. **Pas extensible** : aucun systeme de rendu dynamique, composants SVG en dur

---

## Architecture cible

```text
Input (texte/image/doc)
       |
  Edge Function (prompt generique physique Terminale)
       |
  CognitiveJSON V2 (schema generique)
       |
  Scene Graph (entites + connexions + forces + annotations)
       |
  Moteur de rendu dynamique (registry de renderers SVG)
       |
  Canvas interactif + Steps + Controles contextuels
```

---

## 1. Design — Premium, vendable

**Exit** : neon cyan/magenta partout, glows, emojis, grid-bg visible, "crachat IA"

**Enter** : Design inspire Notion/Linear/Figma
- Fond : slate-950 (#0B1120) tres sombre, propre, pas de grille visible
- Accent unique : bleu electrique (#3B82F6) pour les interactions, un seul accent
- Texte : blanc casse sur fond sombre, hierarchie claire
- Cards : glassmorphism subtil (bg blanc 5% opacity, border blanc 8%)
- Typo : Inter pour le corps (plus lisible que Space Grotesk), JetBrains Mono pour les formules uniquement
- Zero emoji dans l'UI — icones Lucide uniquement
- Animations : transitions douces, pas de glow tape-a-l'oeil
- Layout : sidebar gauche fixe (navigation steps), centre = canvas, header minimal

**Resultat** : une app qui ressemble a un produit SaaS serieux, pas un projet hackathon.

---

## 2. CognitiveJSON V2 — Schema generique

Le schema actuel est trop specifique (height, gravity, free_fall). Nouveau schema :

- **meta** : domain (mechanics/electricity/optics/...), scenario, title
- **entities** : objets generiques avec proprietes arbitraires (masse, charge, resistance, longueur, angle...), position {x,y}, connections entre entites
- **diagram** : nouveau champ — description de la scene a dessiner
  - `type` : free_fall | inclined_plane | pulley | circuit | projectile | spring | pendulum | collision | ...
  - `elements[]` : liste d'elements visuels (ground, slope, wire, resistor, capacitor, battery, rope, spring, wall, axis...)
  - Chaque element a : type, position, rotation, dimensions, label, style
- **forces[]** : vecteurs de force avec point d'application, direction, magnitude, label
- **timeline** : etapes de resolution (concept, equation, substitution, solve, diagram, motion)
- **constants** : dictionnaire libre (g, k, mu, epsilon...)

---

## 3. Moteur de rendu SVG — Registry pattern

Remplacer le `PhysicsCanvas` hardcode par un systeme modulaire :

**SceneRenderer** : composant principal qui lit `diagram.type` et dispatch

**Registry de composants SVG** (chacun dans son fichier) :
- `renderers/GroundRenderer` — sol, surface
- `renderers/ObjectRenderer` — cercle/rectangle avec label
- `renderers/VectorRenderer` — fleche avec label (forces, vitesses)
- `renderers/SlopeRenderer` — plan incline avec angle
- `renderers/SpringRenderer` — ressort (zig-zag SVG)
- `renderers/RopeRenderer` — corde/fil avec tension
- `renderers/PulleyRenderer` — poulie
- `renderers/WireRenderer` — fil electrique
- `renderers/ResistorRenderer` — resistance (symbole standard)
- `renderers/CapacitorRenderer` — condensateur
- `renderers/BatteryRenderer` — generateur
- `renderers/AxisRenderer` — axes de reference (x,y)
- `renderers/DimensionRenderer` — cotes/annotations
- `renderers/CurrentFlowRenderer` — animation de courant electrique

Chaque renderer recoit ses props du JSON et se dessine. Le moteur compose la scene automatiquement.

**Phase 1 (mecanique)** : Ground, Object, Vector, Slope, Spring, Rope, Pulley, Axis, Dimension
**Phase 2 (electricite)** : Wire, Resistor, Capacitor, Battery, CurrentFlow

---

## 4. Edge Function — Prompt generique

Refonte complete du prompt systeme :
- Plus de "chute libre uniquement" — accepte TOUT probleme de physique Terminale C
- Le schema de tool-calling reflete le CognitiveJSON V2
- Le prompt guide l'IA pour generer les elements de diagramme corrects selon le type de probleme
- Exemples dans le prompt : plan incline, circuit RLC, projectile, pendule

---

## 5. Input enrichi

- Textarea au lieu d'input simple (les enonces sont longs)
- Upload d'image (photo d'un enonce papier) — l'IA fait l'OCR via le modele multimodal (Gemini gere les images)
- Exemples varies : chute libre, plan incline, circuit electrique, projectile

---

## 6. Controles contextuels

Plus de sliders "hauteur" et "gravite" en dur. Les controles sont generes dynamiquement a partir du JSON :
- Si le probleme a un angle → slider angle
- Si le probleme a une resistance → slider resistance
- Si le probleme a une masse → slider masse
- Chaque constante/variable du JSON peut devenir un slider interactif

---

## 7. Fichiers impactes

| Fichier | Action |
|---------|--------|
| `src/index.css` | Refonte complete palette + typo |
| `tailwind.config.ts` | Nouveaux tokens design |
| `src/types/cognitive.ts` | CognitiveJSON V2 |
| `src/pages/Index.tsx` | Nouveau layout premium |
| `src/components/ExerciseInput.tsx` | Textarea + upload image |
| `src/components/PhysicsCanvas.tsx` | Supprime → remplace par SceneRenderer |
| `src/components/SceneRenderer.tsx` | NOUVEAU — moteur de rendu dynamique |
| `src/components/renderers/*.tsx` | NOUVEAU — 10+ renderers SVG |
| `src/components/StepsPanel.tsx` | Refonte design |
| `src/components/ControlsPanel.tsx` | Controles dynamiques depuis JSON |
| `supabase/functions/parse-exercise/index.ts` | Prompt + schema generique |
| `mem://` | Mise a jour design + schema |

---

## Scope de cette iteration

**Priorite** : mecanique complete (8-10 types de problemes) + design premium
- Chute libre, projectile, plan incline, lois de Newton, ressort, pendule, poulie, frottement
- Tous les renderers mecanique
- Design vendable
- Input texte + image

**Suivant** : electricite (circuits, lois de Kirchhoff, RLC)

