## Objectif

Ajouter un **overlay flottant "Paramètres"** ouvrable depuis la toolbar (icône Sliders). Il liste les paramètres détectés dans l'énoncé (masse, longueur, angle, gravité, k, R, U, …) avec des sliders + champs numériques. Toute modification est appliquée **en temps réel** sur le schéma et sur les valeurs calculées dans les étapes de résolution.

## Contexte technique

Tout est déjà en place côté données :
- `data.constants` est extrait par l'IA (`g`, `m`, `L`, `theta`, `k`, …).
- `Index.tsx` stocke `constants` dans un state, et `scene = useMemo(() => computeLayout({...data, constants}, t), [data, constants, t])`.
- `ControlsPanel.tsx` existe déjà avec sliders + métadonnées (label, unité, min/max, step) pour ~16 paramètres physiques courants.
- Tous les scénarios (`pendulum.ts`, etc.) lisent `constants.g`, `constants.L`, `constants.m`… → re-render instantané.

Manque uniquement : exposer ce panneau dans le workspace + un mécanisme pour recalculer les valeurs des étapes (`step.result`, `step.formula`) en temps réel.

## Plan d'implémentation

### 1. Nouvel overlay `ParamsOverlay.tsx`

- Petit panneau flottant ancré en haut-droite de la zone canvas (≈ 320px de large), draggable optionnel.
- Header : titre "Paramètres" + bouton fermer.
- Corps : réutilise `ControlsPanel` (déjà fonctionnel), enrichi avec :
  - Champ numérique éditable à côté de chaque slider (saisie précise).
  - Bouton "Réinitialiser" qui restaure `data.constants` initial.
  - Indicateur visuel discret (point coloré) sur les paramètres modifiés vs. originaux.
- Animation slide-in depuis la droite, fond `bg-card/95 backdrop-blur` + `shadow-elevated`, fermable par Échap.

### 2. Intégration dans la toolbar (`AnimationPlayer.tsx`)

- Ajout d'une icône **`Sliders` (lucide)** dans le groupe d'outils à droite, avec tooltip "Paramètres".
- Badge numérique discret affichant le nombre de paramètres détectés (ex : "5").
- Active state quand l'overlay est ouvert.
- Nouvelles props : `paramsOpen`, `onToggleParams`, `paramsCount`.

### 3. State + câblage dans `Index.tsx`

- `const [paramsOpen, setParamsOpen] = useState(false)`.
- `const initialConstants = useRef<Record<string, number>>({})` rempli quand `data` change pour permettre le reset.
- L'overlay est rendu en absolu au-dessus de la colonne droite (`SceneRenderer`).
- `onConstantChange` modifie déjà `constants` → `useMemo` recalcule la scène → re-render instantané. **Aucune latence, pas d'appel IA.**

### 4. Recalcul en temps réel des résultats numériques

`step.result` et `step.formula` viennent de l'IA et contiennent des valeurs figées (ex : `T = 2.46s`). Pour qu'ils suivent les sliders :

- Ajout d'un module `src/lib/physics/recompute.ts` : pour chaque scénario, fonctions pures qui recalculent les grandeurs dérivées à partir de `constants` (ex : pendule → `T = 2π√(L/g)`, `vmax = √(2gL(1-cos θ))`).
- Dans `BlackboardOverlay`/`StepsPanel`, on substitue les valeurs de `step.result` par les recalculs si une fonction est dispo pour le scénario courant. Sinon affichage IA d'origine.
- Couvre les scénarios standards : `free_fall`, `inclined_plane`, `pulley`, `inclined_pulley`, `projectile`, `spring`, `pendulum`, `horizontal_motion`. Pour `circuit` et `generic` : pas de recompute, juste schéma.

### 5. Persistance

`constants` est déjà dans `debouncedSave` → les valeurs ajustées sont sauvegardées automatiquement avec la session.

## Fichiers touchés

- **Créés** : `src/components/ParamsOverlay.tsx`, `src/lib/physics/recompute.ts`
- **Édités** : `src/pages/Index.tsx` (state + montage overlay + initialConstants ref), `src/components/AnimationPlayer.tsx` (bouton Sliders), `src/components/ControlsPanel.tsx` (ajouter input numérique + indicateur "modifié"), `src/components/BlackboardOverlay.tsx` (utiliser recompute si dispo)

## Ce qui n'est PAS fait

- Pas de modification de l'énoncé textuel ni d'appel à l'IA quand on bouge un slider (réservé au chat).
- Édition visuelle directe sur le canvas : explicitement reportée par l'utilisateur.
