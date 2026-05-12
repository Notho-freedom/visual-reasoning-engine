# Plan — OpenRouter gratuit, upload multi-exercices, home Lovable-like

## 1. Bascule sur OpenRouter (modèles gratuits) + fallback Lovable AI

Objectif : ne plus consommer de crédits Lovable AI tant que l'app n'est pas validée. OpenRouter d'abord (modèles `:free`), Lovable AI uniquement si tout échoue.

### Pipeline d'appel unifié
Nouvelle couche `supabase/functions/_shared/aiClient.ts` (importée par toutes les edge functions) :

```text
callAI(messages, { json?, schema? })
  ├─ 1. Liste de modèles gratuits (cache 1h via fetch GET https://openrouter.ai/api/v1/models, filtrée sur pricing.prompt === "0")
  ├─ 2. Cascade ordonnée (priorité raisonnement structuré) :
  │     - deepseek/deepseek-chat-v3.1:free
  │     - deepseek/deepseek-r1:free
  │     - meta-llama/llama-3.3-70b-instruct:free
  │     - qwen/qwen-2.5-72b-instruct:free
  │     - google/gemini-2.0-flash-exp:free
  │     - mistralai/mistral-small-3.2-24b-instruct:free
  │  → POST https://openrouter.ai/api/v1/chat/completions
  │     headers: Authorization Bearer OPENROUTER_API_KEY, HTTP-Referer, X-Title
  ├─ 3. Si 429 / 402 / 5xx / JSON invalide → modèle suivant (silencieux, log)
  └─ 4. Si toute la cascade échoue → fallback Lovable AI Gateway (google/gemini-3-flash-preview)
```

### Fonctions à brancher dessus
- `parse-exercise/index.ts` (extracteur + constructeur) — remplace les 2 appels directs Gateway
- `chat-modify` (si présent dans `ChatPanel`) — idem
- Future fonction `extract-document` (voir §2)

### Secret requis
`OPENROUTER_API_KEY` — à ajouter via le tool secrets (l'utilisateur récupère une clé gratuite sur openrouter.ai/keys).

### UI
Petit badge discret en bas du workspace : `IA: deepseek-r1:free` (ou modèle utilisé), passe en orange si fallback Lovable AI déclenché.

---

## 2. Upload PDF / image multi-exercices avec onglets séquentiels

### Flux utilisateur
```text
[Hero] bouton 📎 "Importer un sujet (PDF, image)"
   ↓
Upload → extract-document edge function
   ↓
Liste d'exercices détectés [Ex 1, Ex 2, Ex 3, …]  ← onglets en haut du workspace
   ↓
Chaque onglet passe automatiquement par parse-exercise (file séquentielle)
   ├─ Ex 1: ✓ analysé → schéma + étapes affichés
   ├─ Ex 2: ⏳ en cours (spinner sur l'onglet)
   └─ Ex 3: ⌛ en attente
```

### Edge function `extract-document`
- Entrée : `{ fileBase64, mimeType }` (PDF ou image)
- Pour PDF : pdf-parse côté Deno (texte brut) + si peu de texte (scan) → fallback vision
- Pour image / scan : vision model gratuit OpenRouter (`google/gemini-2.0-flash-exp:free` ou `qwen/qwen-2.5-vl-72b:free`)
- Prompt : "Repère chaque exercice indépendant dans ce document. Renvoie un tableau JSON `{ exercises: [{ index, statement }] }`. Ignore consignes générales, en-têtes, numéros de page."
- Sortie : `{ exercises: [{ id, statement }] }`

### Frontend
- Nouveau composant `ExerciseTabs.tsx` au-dessus du workspace 3 colonnes
- État global : `Map<exerciseId, { statement, status: 'pending'|'parsing'|'ready'|'error', cognitiveJson? }>`
- Worker côté client : traite les exercices `pending` un par un via `parseExercise()` (pas en parallèle pour ne pas saturer la cascade gratuite)
- Onglet actif → l'app affiche le `cognitiveJson` correspondant dans le canvas + chat + steps
- Persistance locale (localStorage) pour ne pas perdre les onglets au refresh

### Limite
- Taille fichier max : 5 Mo
- Max 10 exercices par doc (anti-abus)

---

## 3. NE PAS ajouter de générateur d'exercices statique

Conformément à la décision : on ne fait **pas** de page "générer des exercices par thème". L'IA lit ce qui arrive (collé ou uploadé), classe le scénario (déjà fait), construit le schéma. Si l'énoncé n'entre dans aucun scénario supporté, on affiche un message clair plutôt que d'inventer.

À ajouter côté `parse-exercise` :
- Si scénario non reconnu après les 2 passes → retour `{ unsupported: true, reason }` au lieu d'un faux JSON
- Toast UX : "Ce type d'exercice n'est pas encore supporté (scénarios actuels : chute, plan incliné, ressort, projectile, pendule, poulie, circuit RC). Reformule ou essaie un autre énoncé."

---

## 4. Refonte de la page d'accueil — clone exact de lovable.dev

Référence : structure visuelle identique à lovable.dev (visite préalable pour caler le rythme).

### Sections (dans l'ordre)
1. **Top nav** minimaliste : logo "PhysicsEngine" à gauche, liens (Communauté, Tarifs, Apprendre, Lancer), bouton "Connexion" + CTA noir "Commencer" à droite.
2. **Hero** plein écran avec gradient soft (rose→violet→bleu) :
   - H1 énorme (~72px) : "Résolvez n'importe quel problème de physique."
   - Sous-titre (~20px gris) : "Collez un énoncé, importez un sujet — l'IA construit le schéma, les forces et la solution étape par étape."
   - Champ central rounded-2xl XL avec ombre douce : textarea + bouton 📎 (upload doc) + flèche d'envoi noire ronde
   - 4 pills d'exemples sous le champ (chute libre, plan incliné, ressort, projectile)
   - Sélecteur "Public/Privé" + niveau (Lycée/Prépa) en pied de champ (mimétisme exact Lovable)
3. **From the Community** — galerie d'exercices déjà résolus (à la place des templates Lovable) :
   - Grille 3 colonnes de cartes : aperçu canvas (mini schéma SVG), titre énoncé, scénario, "Voir la résolution"
   - Onglets de filtre : Populaires / Récents / Mécanique / Électricité / Oscillations
   - Données : tableau statique de ~12 exercices types pré-calculés (JSON dans `src/data/gallery.ts`)
4. **Features bento** — 3-4 cartes : "IA qui comprend l'énoncé", "Schémas physiquement justes", "Import PDF/photo", "Étapes avec formules"
5. **Footer** sobre

### Détails design (déjà dans la mémoire)
- Inter partout, JetBrains Mono pour les valeurs
- CTA noirs `rounded-full`, fond off-white `#FAFAF9`, cartes blanches avec `shadow-soft`
- Animation framer-motion : fade-up du hero, hover scale sur cartes galerie

### Workspace
- Page workspace (après envoi/upload) reste la structure 3 colonnes actuelle
- Ajout : barre d'onglets exercices en haut si import multi-exercices

---

## 5. Détails techniques

### Fichiers créés
- `supabase/functions/_shared/aiClient.ts` — cascade OpenRouter + fallback
- `supabase/functions/_shared/freeModels.ts` — liste + cache /models
- `supabase/functions/extract-document/index.ts` — extraction multi-exercices
- `src/components/ExerciseTabs.tsx` — onglets workspace
- `src/components/UploadButton.tsx` — bouton 📎 dans hero + workspace
- `src/components/home/HomeNav.tsx`
- `src/components/home/HeroLovable.tsx`
- `src/components/home/CommunityGallery.tsx`
- `src/components/home/FeaturesBento.tsx`
- `src/components/home/HomeFooter.tsx`
- `src/data/gallery.ts` — ~12 exercices résolus pré-calculés
- `src/hooks/useExerciseQueue.ts` — worker séquentiel client

### Fichiers modifiés
- `supabase/functions/parse-exercise/index.ts` — utilise `aiClient`, retourne `unsupported` si nécessaire
- `src/pages/Index.tsx` — nouvelle home (refactor)
- `src/lib/api.ts` — `parseExercise` gère `unsupported`, ajout `extractDocument()`
- `src/types/cognitive.ts` — type `Exercise` (id, statement, status, json)

### Secret
- `OPENROUTER_API_KEY` (à demander via add_secret après approbation du plan)

### Hors scope
- Pas de BDD : tout reste en localStorage / état React
- Pas d'auth, pas de profils
- Pas de générateur statique d'exercices
- Pas de refonte du moteur physique (déjà en cours)

---

## Critères de succès
- Plus aucun appel direct Lovable AI sauf si toute la cascade gratuite échoue
- Upload d'un PDF de TD avec 4 exercices → 4 onglets, traités l'un après l'autre, schémas corrects
- Home indiscernable visuellement d'un clone de lovable.dev (hors contenu)
- Énoncé hors scénario → message clair, pas de schéma cassé
