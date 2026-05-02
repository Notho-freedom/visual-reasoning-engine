## Objectif

Abandonner le thème néon sombre actuel et adopter intégralement le design system de Lovable (lovable.dev), mais appliqué à notre contexte : au lieu de "construire des apps", on "résout des problèmes de physique". Le canvas central affiche les schémas physiques animés au lieu d'une preview d'app.

## Identité visuelle Lovable à reproduire

**Palette (light theme par défaut)**
- Fond principal : blanc cassé `#FAFAF9` / off-white
- Surfaces cartes : blanc pur `#FFFFFF`
- Texte : noir profond `#0A0A0A` / gris foncé
- Bordures : gris très clair `#E7E5E4`
- Accent CTA : noir `#000000` (boutons "Get started" style)
- Gradient signature : rose → violet → bleu (`#FF6B9D → #A855F7 → #3B82F6`) utilisé pour fond hero et accents

**Typographie**
- Titres : Inter / sans-serif, très gras (700-800), tracking serré
- Corps : Inter 400-500
- Mono : pour valeurs numériques uniquement
- Abandonner JetBrains Mono comme police principale, garder pour badges techniques

**Composants signature**
- Hero avec gros titre centré + sous-titre gris + barre de prompt arrondie XL avec ombre douce
- Boutons noirs arrondis (rounded-full), petits badges pill bleus ("New")
- Cartes blanches, bordure 1px gris clair, radius `xl` (16px), ombre subtile
- Inputs grands, bg légèrement teinté, padding généreux

## Adaptation au contexte physique

```text
┌─ Header (blanc, fin) ─────────────────────────────┐
│ [Logo PhysicsEngine + nom]      [Solutions ▾] [↗] │
├───────────────────────────────────────────────────┤
│                                                   │
│         ╭─── gradient rose/violet/bleu ───╮       │
│                                                   │
│             Résolvez n'importe quel                │
│             problème de physique                   │
│                                                   │
│         Décrivez un exercice, voyez le             │
│         schéma animé et la solution pas-à-pas      │
│                                                   │
│      ┌─────────────────────────────────┐          │
│      │ Décrivez votre exercice de      │          │
│      │ physique...                     │          │
│      │                                 │          │
│      │ [+] [examples ▾]      [Résoudre→]│         │
│      └─────────────────────────────────┘          │
│                                                   │
│       Exemples : [Chute libre] [Plan incliné]     │
│       [Pendule] [Circuit RC] [Poulie]             │
│                                                   │
└───────────────────────────────────────────────────┘
```

**Après soumission** : transition vers la vue workspace (style éditeur Lovable)

```text
┌─ Header blanc ────────────────────────────────────┐
├──────────────┬────────────────────────┬───────────┤
│              │                        │           │
│  Énoncé      │    SCHÉMA ANIMÉ        │ Résolution│
│  (chat-like) │    (canvas central     │ (timeline │
│              │     blanc, ombre)      │  d'étapes)│
│  + textarea  │                        │           │
│  pour suivi  │   [▶ player en bas]    │           │
│              │                        │           │
└──────────────┴────────────────────────┴───────────┘
```

Le panneau gauche imite le panneau chat de l'éditeur Lovable (bulles d'énoncé + bouton "Modifier l'énoncé"). Le centre = "preview" mais c'est notre `SceneRenderer` sur fond blanc avec ombre douce arrondie. Le panneau droit garde les étapes mais re-stylé en cartes blanches.

## Changements techniques

### 1. Tokens (`src/index.css`)
Remplacer toutes les variables HSL par la palette claire Lovable :
- `--background: 60 9% 98%` (off-white)
- `--foreground: 0 0% 4%`
- `--card: 0 0% 100%`
- `--border: 20 6% 90%`
- `--primary: 0 0% 0%` (boutons noirs)
- `--muted-foreground: 0 0% 45%`
- Nouveau : `--gradient-hero: linear-gradient(135deg, #FF6B9D 0%, #A855F7 50%, #3B82F6 100%)`
- Radius : passer à `0.875rem` (Lovable utilise du rounded-2xl partout)

Garder un mode dark optionnel mais le default = light.

### 2. Typo (`src/index.css` + `tailwind.config.ts`)
- Police par défaut : Inter (déjà importé)
- Supprimer Space Grotesk (n'est plus dans la mémoire core mais peut traîner)
- Mettre à jour memory : nouveau design system

### 3. Page d'accueil (`src/pages/Index.tsx`) — refonte complète
- État vide = hero Lovable-style (centré, gradient en fond, gros titre, sous-titre, gros input avec ombre, boutons exemples en pills)
- État résolu = workspace 3 colonnes (sidebar gauche énoncé / canvas blanc central / sidebar droite étapes)
- Header minimaliste blanc avec logo + nom à gauche, actions à droite
- Bouton "Nouvel exercice" en haut à droite (équivalent du "+ New project")

### 4. Canvas central (`SceneRenderer.tsx` + wrapper)
- Fond : `bg-white` au lieu de gradient sombre
- Bordure subtile, `rounded-2xl`, `shadow-lg shadow-black/5`
- La grille de fond passe à gris très clair `#F5F5F4`
- Les couleurs des renderers (forces, axes, labels) à recalibrer pour fond blanc :
  - Forces `P` : rouge `#DC2626`
  - Forces `N`/`T` : bleu `#2563EB`
  - Frottement `f` : orange `#EA580C`
  - Axes : noir `#0A0A0A`
  - Texte labels : noir
- Tous les `hsl(var(--foreground))` etc. continueront de fonctionner via les nouveaux tokens

### 5. Panneaux latéraux
- `bg-white`, bordure droite/gauche `border-stone-200`
- Padding plus généreux (lovable est aéré)
- Steps en cartes blanches avec hover gris très clair, étape active = bordure noire fine
- AnimationPlayer : barre claire avec slider noir

### 6. Composants à re-styler
- `AnimationPlayer.tsx` : controls noirs, slider rail gris clair / fill noir
- `StepsPanel.tsx` : cartes blanches `border-stone-200`, étape active fond `stone-50` + bordure `stone-900`
- `ControlsPanel.tsx` : sliders style Lovable
- `ExerciseInput.tsx` (utilisé dans le hero) : grand textarea arrondi avec ombre, bouton CTA noir arrondi

### 7. Renderers couleurs
Tous les renderers utilisent `hsl(var(--...))` donc basculement automatique. Vérifier juste :
- `WorldAxisRenderer`, `LocalAxisRenderer` : lisibilité sur blanc OK avec nouveau `--foreground`
- `CurrentFlowRenderer` : passer `primary` à un bleu vif pour rester visible
- `VectorRenderer` : couleurs forces hardcodées → introduire palette dédiée dans un fichier `src/lib/physics/colors.ts`

### 8. Header
- Hauteur 56px, fond blanc, bordure bas `stone-200`
- Logo : icône `Atom` dans un petit carré gradient (rose→violet→bleu) + texte "PhysicsEngine" bold
- Bouton noir arrondi à droite : "Nouvel exercice"

### 9. État vide (hero)
- Fond : gradient pastel blurry (rose/violet/bleu très dilués, façon mesh gradient Lovable)
- Centré verticalement, max-w-2xl
- Titre h1 4xl-6xl, sous-titre xl gris
- Input large arrondi (radius 24px), ombre généreuse
- Sous l'input : pills cliquables d'exemples au lieu de la longue liste sidebar
- Pas de sidebar visible avant le premier exercice

### 10. Transitions
- Quand l'utilisateur soumet, fade le hero, slide-in les panneaux workspace
- `transition-all duration-300`

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/index.css` | Refonte totale tokens (light theme, gradient hero, radius) |
| `tailwind.config.ts` | Vérifier extension colors, ajouter `stone` palette si besoin |
| `src/pages/Index.tsx` | Refonte complète (hero + workspace) |
| `src/components/SceneRenderer.tsx` | Fond blanc, grille claire, couleurs renderers |
| `src/components/AnimationPlayer.tsx` | Re-style light |
| `src/components/StepsPanel.tsx` | Cartes blanches |
| `src/components/ControlsPanel.tsx` | Sliders light |
| `src/components/ExerciseInput.tsx` | Hero input style Lovable (grand, ombre) |
| `src/components/renderers/*` | Vérifier contraste sur blanc, ajuster CurrentFlow + VectorRenderer |
| `src/lib/physics/colors.ts` | NOUVEAU — palette forces centralisée |
| `mem://design/tokens` | MAJ — nouveau design system |
| `mem://index.md` | MAJ Core — light theme Lovable, gradient hero |

## Hors scope
- Ne pas toucher à la logique physique (solveurs, animations, sync timeline)
- Ne pas toucher à l'edge function
- Pas de mode dark dans cette itération (peut être ajouté plus tard via toggle)

## Résultat attendu
À l'arrivée, l'utilisateur voit un clone fidèle de lovable.dev avec gradient hero, gros prompt, exemples en pills. Après soumission, workspace blanc épuré 3 colonnes avec le schéma physique animé en plein centre dans une carte blanche avec ombre douce — exactement comme l'éditeur Lovable montre la preview d'app, mais ici on montre un schéma de physique.
