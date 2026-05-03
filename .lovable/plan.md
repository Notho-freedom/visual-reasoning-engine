
# Studio "tableau plein écran" + sync animation + persistance

## 1. Layout : panels en overlay (toggleable)

Le tableau central devient l'élément principal. Chat et Historique deviennent des panneaux flottants qu'on ouvre/ferme via icônes dans le header.

**Header** (ajouts) :
- Bouton `MessageSquare` → toggle panel Chat (gauche, slide-in)
- Bouton `History` → toggle panel Historique (droite, slide-in)
- Bouton `Settings` → menu options (sync, vitesse typewriter, thème tableau, reset, …)
- Compteur historique en badge sur l'icône

**Panels** :
- `ChatPanel` rendu en `<aside>` flottant `absolute top-14 left-0 bottom-0 w-[360px]` avec `animate-slide-in-right` (inversé), backdrop `bg-sidebar/95 backdrop-blur` + `shadow-elevated`. Contient l'énoncé éditable en haut + chat en dessous.
- `HistoryPanel` symétrique à droite.
- Clic en dehors ou re-clic sur l'icône → ferme.
- État `chatOpen`/`historyOpen` dans `Index.tsx`. Par défaut **fermés**, l'utilisateur voit donc `[ tableau plein écran + toolbar ]`.

## 2. Blackboard cumulatif sans bordure

Refonte de `BlackboardOverlay.tsx` :
- Plus de carte avec bordure/ombre. Le composant est un `<div>` `absolute inset-0 p-8 pointer-events-none` qui écrit directement sur le canvas.
- Police `JetBrains Mono`, couleur `text-foreground/85`, taille ~14px, leading relaxed.
- **Cumulatif** : on garde un `useRef<TimelineStep[]>` des étapes déjà écrites. Quand `currentStep` change vers une étape jamais écrite → on l'append. Si on revient en arrière (sync) → on n'efface pas, on highlight la ligne courante en gras.
- **Typewriter par étape** : nouvelle étape ajoutée → typewriter sur ses lignes uniquement (titre, formule, résultats), les anciennes restent statiques. Vitesse configurable (défaut 80 cps) via prop / settings menu.
- **Auto-scroll vertical** : quand le contenu dépasse la hauteur de la zone (mesurée via `ResizeObserver`), on décale les anciennes lignes vers le haut (`transform: translateY(-Δ)` avec transition douce) pour libérer de la place en bas. Pas de scrollbar visible : c'est un défilement automatique. Si on doit vraiment effacer (très long), on retire les premières lignes une fois qu'elles sont sorties depuis assez longtemps.
- Format des lignes :
  ```
  ─── Étape 2 · Équation ───
    ΣF = m·a
    Description courte ici
    a = 2.45 m/s²
  ```
- Reset complet du buffer quand `data` change (nouvel exercice ou modification depuis chat).

## 3. Synchronisation solides ↔ forces

Audit ciblé de chaque scénario : les forces utilisent les centres calculés en fonction de `frame.t`, mais certains **éléments visuels** (notamment `local_axis`, `world_axis` ou positions de blocs) doivent suivre la même position que les forces.

Vérifications + corrections :
- **`pulley.ts`** : `c1`, `c2` recalculés par frame ✓ — déjà OK. Vérifier que `ObjectRenderer` n'utilise pas une position cachée.
- **`inclinedPulley.ts`**, **`spring.ts`**, **`pendulum.ts`**, **`projectile.ts`**, **`freeFall.ts`**, **`horizontal.ts`**, **`inclinedPlane.ts`** : passer en revue et s'assurer que le `position` de chaque `block`/`ball`/`local_axis` est calculé à partir de la **même variable** que les ancres de force et les cordes.
- **Cause racine probable** : dans `ObjectRenderer`, vérifier qu'il n'y a pas de mémoïsation/clé qui empêche le re-render quand la position change. Ajouter `key={el.id}` est déjà fait au niveau parent. Suspect principal : un éventuel `React.memo` qui ignore le changement de `position` (objet) — passer en `memo` avec comparateur explicite ou retirer.
- Diagnostic : ajouter un log temporaire si besoin, mais le plus probable est qu'`ObjectRenderer` lit `element.position` à un seul moment. À auditer puis fix.

## 4. Toolbar étoffée (sous le tableau, pleine largeur)

Ajouts à `AnimationPlayer` (ou wrapper) :
- Boutons existants (play/pause/reset/sync/prev/next/speed/phase) **conservés**.
- **Nouveaux** :
  - `Maximize` → fullscreen API sur le conteneur tableau
  - `Camera` → screenshot SVG → PNG (canvas conversion) + download
  - `Eye` toggles : afficher/masquer forces, repère monde, repères locaux, grille (props passées à `SceneRenderer`)
  - `Type` → ouvre popover réglages typewriter (vitesse, mode cumul/effacer, taille police)
  - `Layers` → menu zoom canvas (50/75/100/125/150 %)
  - `Copy` → copie le step courant en LaTeX dans le presse-papier
- Densité réduite : icônes en 7×7, séparateurs verticaux entre groupes.

## 5. Chat → modification fiable du schéma

Actuellement `handleChatSend` concatène l'énoncé original avec `MODIFICATION DEMANDÉE: …`. Améliorations :
- Côté front : envoyer aussi le `CognitiveJSON` actuel à l'edge function (champ optionnel `previousJson`) pour que l'IA modifie au lieu de repartir de zéro.
- Côté `supabase/functions/parse-exercise/index.ts` : si `previousJson` est fourni, ajouter au prompt système :
  > "Tu reçois un schéma cognitif existant et une instruction de modification. Renvoie le **schéma complet mis à jour** (pas un patch), en conservant la question d'origine et en intégrant les nouveaux éléments. Recalcule la timeline si la physique change."
- Le scénario peut basculer (ex : `pulley` → `pulley` avec 2 poulies, ou nouveau scénario `multi_pulley` plus tard) ; pour l'instant rester sur les scénarios existants mais ajouter la possibilité d'objets/forces supplémentaires dans `pulley.ts` (gérer N objets si `objects.length > 2`, tracé de cordes adapté). Hors scope si trop complexe : au minimum la regénération doit produire un JSON cohérent et la timeline mise à jour.
- Message assistant dans le chat indique ce qui a changé (diff simple : nouveau scénario, nb objets, nb étapes).

## 6. Persistance locale

Nouveau fichier `src/lib/persistence.ts` :
- Sauve dans `localStorage` :
  - `pe.session.current` : `{ exercise, data, constants, t, currentStep, chatMessages, history, currentHistoryId }`
  - `pe.sessions` : liste `[{ id, title, updatedAt, exercisePreview }]` (max 20)
- API : `saveSession()`, `loadCurrent()`, `listSessions()`, `loadSession(id)`, `deleteSession(id)`, `clearAll()`.
- Dans `Index.tsx` :
  - Au mount : `loadCurrent()` et restore si présent.
  - Sur tout changement significatif (`data`, `exercise`, `constants`, `chatMessages`, `history`) : `saveSession()` debouncé 500 ms.
  - Bouton "Nouvel exercice" → archive la session courante dans `pe.sessions` puis reset.
- Dans le panel Historique (et/ou un nouveau menu "Sessions" dans le header) : liste des sessions sauvegardées, clic → restore. Bouton supprimer.

## 7. Détails UX

- Échap ferme les panels overlay ouverts.
- Tooltip sur chaque icône du header.
- État vide du blackboard : message discret "▸ Lancez l'animation pour voir la résolution s'écrire ici."
- Animation slide-in pour les panels (utilise `animate-slide-in-right` de Tailwind, miroir pour gauche).

## Fichiers touchés

```text
src/pages/Index.tsx              refonte layout (panels overlay, état toggle, persistance)
src/components/BlackboardOverlay.tsx   réécrit : cumulatif, sans bordure, scroll auto
src/components/AnimationPlayer.tsx     ajout boutons (fullscreen, screenshot, toggles, zoom, copy)
src/components/SceneRenderer.tsx       props show* (forces/axes/grid), zoom
src/components/HeaderToolbar.tsx       NEW : icônes header (chat, history, settings, sessions)
src/components/SessionsMenu.tsx        NEW : dropdown sessions sauvegardées
src/components/ChatPanel.tsx           wrapper overlay (slide-in, close button)
src/components/HistoryPanel.tsx        wrapper overlay (slide-in)
src/lib/persistence.ts                 NEW : localStorage helpers
src/lib/physics/scenarios/*.ts         audit positions blocs vs forces (pulley en priorité)
src/components/renderers/ObjectRenderer.tsx   vérifier re-render position
supabase/functions/parse-exercise/index.ts    accepter previousJson + prompt modif
src/lib/api.ts                         signature parseExercise(text, previousJson?)
```

## Hors scope (pour plus tard)

- Édition visuelle (drag des objets sur le tableau)
- Persistance cloud (Supabase)
- Export PDF (bouton déjà placeholder)
- Refonte profonde du moteur pour systèmes vraiment arbitraires (N poulies, N masses interconnectées) — pour l'instant, on étend `pulley.ts` à plusieurs masses sur la même corde mais sans Lagrangien général.
