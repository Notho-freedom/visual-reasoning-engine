

## Analyse

L'utilisateur veut 3 chantiers majeurs :

1. **Repères corrects** : repère application (global, fixe en bas-gauche) + repère système (lié à chaque solide, projections des forces)
2. **Animations physiques réelles** : chaque scénario joue son mouvement naturel (chute, glissement, compression/relâchement, oscillation, rotation poulie) avec play/pause/scrubber
3. **Refonte design** : layout grand écran centré sur le schéma (priorité 1), calculs/explications (priorité 2), énoncé (priorité 3)

## Exploration nécessaire

J'ai déjà le contexte sur layoutEngine, scenarios, renderers, types. Pas besoin de relire, je connais l'architecture.

## 1. Animation Engine (le cœur du sprint)

**Nouveau module** `src/lib/physics/animation.ts` :
- `AnimationState` : `{ t: number, playing: boolean, duration: number, speed: number }`
- Une fonction `getAnimatedState(scenario, params, t)` retourne pour chaque scénario les positions/forces à l'instant `t`

**Par scénario, équations du mouvement** :
- **free_fall** : `y(t) = h - ½g·t²`, t_max quand y=0. Force poids visible tout du long.
- **projectile** : `x(t) = v₀cos(θ)·t`, `y(t) = v₀sin(θ)·t - ½g·t²`. Trace progressive.
- **inclined_plane** : `s(t) = ½·a·t²` avec `a = g(sin α - μcos α)`. Bloc glisse le long. Forces réorientées selon direction du mouvement (frottement opposé au déplacement).
- **spring** : phase 1 (compression linéaire 0→x_max sous force F_appliquée), phase 2 (oscillation `x(t) = x_max·cos(ω·t)` avec `ω = √(k/m)`). Force ressort = -k·x change de sens.
- **pendulum** : `θ(t) = θ₀·cos(ω·t)` avec `ω = √(g/L)`. Tension toujours le long de la corde, poids vertical, projections affichées.
- **pulley** : 2 blocs, accélération `a = (m₁-m₂)g/(m₁+m₂)`. Un monte, l'autre descend, corde s'allonge/raccourcit symétriquement.
- **horizontal_motion** : translation `x(t) = ½a·t²` ou `x(t) = v₀·t`.

**Intégration** : `computeLayout(data, animState)` accepte un état d'animation optionnel et passe `t` au solveur. Les solveurs réutilisent leur logique géométrique mais avec des positions/forces dépendantes de `t`.

## 2. Repères (axes)

**Repère application** (global) :
- Toujours visible en bas-gauche du SVG, fixe
- Flèches X (droite) + Y (haut), labels, échelle (1m)
- Composant `WorldAxisRenderer` distinct

**Repère système** (local à un objet) :
- Pour plan incliné : axes tournés selon l'angle (x' parallèle à la pente, y' perpendiculaire)
- Pour pendule : axes tangentiel/normal au mouvement
- Pour ressort : axe selon direction du ressort
- Affiché au centre du solide concerné, plus petit, couleur distincte
- Composant `LocalAxisRenderer` qui prend `{ origin, rotationDeg, label }`
- Lors d'une étape qui parle de projection, on highlight le repère local + on dessine les composantes projetées des forces (pointillés)

## 3. Animation Player (UI)

Nouveau composant `AnimationPlayer.tsx` :
- Bouton Play/Pause (Lucide `Play`/`Pause`)
- Bouton Reset
- Slider de scrubbing temporel (0 → t_max)
- Affichage `t = X.XX s`
- Contrôle vitesse (0.25x, 0.5x, 1x, 2x)
- Le play utilise `requestAnimationFrame` côté React, met à jour `t` qui re-trigger `computeLayout`

## 4. Refonte design — Layout grand écran

**Nouveau layout** dans `Index.tsx` :
```
┌─────────────────────────────────────────────────────┐
│  Header minimal (32px) — logo + meta exercice       │
├──────────┬──────────────────────────────┬───────────┤
│          │                              │           │
│ Énoncé   │      SCHÉMA + ANIMATION      │  Étapes   │
│ (240px)  │      (FLEX-1, ÉNORME)        │  (300px)  │
│ collap-  │      max-h: 70vh             │  scroll   │
│ sable    │                              │           │
│          │  ─────────────────────       │           │
│          │  Player (play/pause/seek)    │           │
│          │  ─────────────────────       │           │
│          │  Sliders constantes (inline) │           │
│          │                              │           │
└──────────┴──────────────────────────────┴───────────┘
```

- Le schéma occupe ~60% de l'écran, viewBox élargi (1200x680 au lieu de 700x380)
- Énoncé devient une sidebar gauche escamotable (icône burger pour ouvrir/fermer)
- Étapes restent à droite, mais design plus compact
- Player + sliders sous le schéma, pas dans une carte séparée

**Polish design** :
- Background `#0A0E1A` (plus profond, moins bleuté)
- Carte schéma : `bg-[#0F1420]` border `#1E2536`, coins `rounded-xl`
- Accent : garder bleu `#3B82F6` mais ajouter un secondaire `#A78BFA` (violet doux) pour les forces de réaction et axes locaux
- Forces : couleurs distinctes et saturées (poids=ambre, normale=cyan, frottement=rose, tension=vert, ressort=violet)
- Labels avec petits backgrounds pill `bg-black/40 px-1.5 rounded-sm` pour lisibilité
- Police schéma : Inter 12px pour labels, JetBrains Mono 11px pour formules/valeurs
- Suppression du `glass-card` partout (devient `bg-card border`)

## 5. Fichiers impactés

| Fichier | Action |
|---|---|
| `src/lib/physics/animation.ts` | NOUVEAU — moteur temporel par scénario |
| `src/lib/physics/scenarios/*.ts` | MODIFIÉ — accepter `t` et calculer positions animées + forces dynamiques |
| `src/lib/physics/layoutEngine.ts` | MODIFIÉ — signature `computeLayout(data, t?)` |
| `src/components/AnimationPlayer.tsx` | NOUVEAU — Play/Pause/Seek/Speed |
| `src/components/renderers/WorldAxisRenderer.tsx` | NOUVEAU — repère global fixe |
| `src/components/renderers/LocalAxisRenderer.tsx` | NOUVEAU — repère lié à un solide |
| `src/components/SceneRenderer.tsx` | MODIFIÉ — toujours afficher repère monde + repères locaux des solides |
| `src/components/ExerciseInput.tsx` | MODIFIÉ — devient compact (sidebar collapsable) |
| `src/components/ControlsPanel.tsx` | MODIFIÉ — sliders inline plus compacts, sans le bloc steps |
| `src/components/StepsPanel.tsx` | MODIFIÉ — design plus compact, mise en avant formule |
| `src/pages/Index.tsx` | REFONTE — nouveau layout 3 colonnes grand écran |
| `src/index.css` | MODIFIÉ — palette ajustée, suppression glass |
| `tailwind.config.ts` | MODIFIÉ — couleurs forces, secondary violet |
| `src/types/cognitive.ts` | MODIFIÉ — ajout `animation?: { duration, autoplay }` dans `DiagramSpec` |

## 6. Hors scope (V2.2 plus tard)

- OCR image (déjà reporté)
- Circuits électriques animés
- Mode "hypothèse" (changer paramètres et comparer)
- Synchronisation timeline ↔ animation (un step déclenche un sous-segment animé)

## Scope cette itération

Animation physique réelle pour les 7 scénarios mécaniques + repères corrects (monde + local) + refonte layout grand écran centré sur le schéma.

