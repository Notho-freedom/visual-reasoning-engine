## Génération d'exercice par IA — difficulté + thème

Bouton ✨ à côté du 📎 dans la textarea hero. Ouvre un petit popover compact : 3 pills de difficulté + dropdown thème (par défaut "Aléatoire"). Bouton "Générer" → l'énoncé apparaît dans la textarea, l'utilisateur édite / valide manuellement avec la flèche d'envoi habituelle.

### UX

```text
[textarea ......................................]
[📎  ✨Générer ▾]                          [→ envoyer]
       │
       └─ popover (240px) :
          Difficulté  [ Facile ] [ Moyen ] [ Difficile ]
          Thème       [ Aléatoire ▾ ]
                         └ Chute libre / Plan incliné / Plan + poulie /
                            Projectile / Ressort / Pendule / Poulie d'Atwood / Circuit RC
          ─────────────────────────
          [ Générer un exercice ]   (loader pendant l'appel)
```

- État `generating` → spinner sur le bouton "Générer", popover reste ouvert.
- Succès → popover se ferme, l'énoncé est inséré dans `heroInput` (remplace le contenu actuel), focus sur la textarea.
- Erreur (cascade vide / 429) → toast destructif, popover reste ouvert.

### Backend

Nouvelle edge function `supabase/functions/generate-exercise/index.ts` :

- Input : `{ difficulty: "facile" | "moyen" | "difficile", scenario?: string }` (scénario optionnel ; sinon tirage aléatoire côté edge parmi les 8 scénarios supportés).
- Utilise `aiClient.ts` existant (cascade OpenRouter gratuit → fallback Lovable AI) pour ne pas brûler de crédits.
- Prompt système : "Tu es prof de physique. Génère UN énoncé d'exercice en français pour le scénario {X} à la difficulté {Y}. Contraintes : valeurs numériques réalistes et cohérentes, une à trois questions claires, pas de solution, pas de schéma. Format : texte brut, 3 à 8 phrases."
- Calibration difficulté :
  - **Facile** : 1 question, données complètes, pas de piège.
  - **Moyen** : 2 questions, une donnée à déduire.
  - **Difficile** : 3 questions liées, plusieurs étapes, frottements ou conditions limites.
- Tool-calling pour structurer la sortie : `{ statement: string, scenario: string }` (on récupère aussi le scénario pour préfix futur).
- Renvoie `{ statement, scenario, difficulty, model }` ; gère 429 / 402 / 500 avec message clair.

### Frontend

Nouveau composant `src/components/GenerateExerciseButton.tsx` :
- Popover (Radix déjà dans shadcn).
- Props : `onGenerated(statement: string) => void`, `disabled?`.
- Appelle nouvelle fonction `generateExercise()` ajoutée à `src/lib/api.ts`.

Intégration dans `src/pages/Index.tsx` :
- Insérer `<GenerateExerciseButton onGenerated={setHeroInput} />` dans la barre `flex items-center justify-between` du formulaire hero, à côté de `<UploadButton />`.
- Aucun changement aux pills d'exemples existantes (complémentaires).

### Fichiers

**Créés**
- `supabase/functions/generate-exercise/index.ts`
- `src/components/GenerateExerciseButton.tsx`

**Modifiés**
- `src/lib/api.ts` — ajout `generateExercise({ difficulty, scenario? }): Promise<{ statement, scenario }>`
- `src/pages/Index.tsx` — bouton dans la toolbar du formulaire hero

### Hors scope
- Pas de génération multi-exercices.
- Pas d'auto-soumission (décision utilisateur : édition manuelle obligatoire).
- Pas de mémorisation du dernier choix difficulté/thème (localStorage) — ajoutable plus tard si besoin.

### Critère de succès
Clic ✨ → popover → "Difficile" + "Plan + poulie" → "Générer" → en <5s l'énoncé apparaît dans la textarea, prêt à être édité ou envoyé. Cascade gratuite épuisée → fallback Lovable AI silencieux. Tout échoue → toast clair.
