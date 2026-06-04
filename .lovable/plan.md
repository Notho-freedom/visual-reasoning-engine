## Diagnostic confirmé

Le bug est réel et reproductible : pour un exercice projectile complexe, la fonction renvoie parfois :

```text
objects: []
forces: []
timeline: []
params: { v0, theta }
```

Donc le schéma peut être partiellement récupéré par patch, mais la résolution reste vide. La cause principale : si l’IA retourne un plan structuré incomplet, le patch actuel ajoute seulement quelques paramètres, mais ne reconstruit ni les objets, ni les forces, ni les étapes de résolution.

## Objectif

Rendre le système robuste même quand l’IA “coince” : jamais de résolution à 0 étape si le scénario est reconnu, et un rendu minimal correct même pour des exercices plus complexes.

## Plan d’implémentation

### 1. Ajouter un “repair engine” déterministe côté fonction IA

Dans `parse-exercise`, remplacer le patch minimal par une réparation complète :

- créer un objet physique par défaut si `objects` est vide ;
- injecter les forces attendues selon le scénario ;
- injecter les constantes extraites en SI ;
- garantir une timeline minimale de 5 à 7 étapes :
  - lecture des données ;
  - bilan des forces ;
  - équation / théorème ;
  - substitution ;
  - résultat ;
  - interprétation.

Pour `projectile`, gérer explicitement :

- tir oblique classique ;
- masse en g → kg ;
- angle en degrés ;
- frottement/traînée constant ;
- travail des frottements ;
- hauteur maximale par énergie ;
- vitesse réelle au retour à l’altitude initiale ;
- distance horizontale si accélération horizontale constante.

### 2. Améliorer l’extraction des grandeurs complexes

Étendre les rôles extraits et les conversions :

- `work` pour Joules ;
- `drag_force` / `force_value` pour frottements constants ;
- `final_speed`, `horizontal_acceleration`, `energy`, `altitude` si présents ;
- nombres français avec virgule décimale ;
- synonymes : travail des forces de frottement, traînée, résistance fluide, altitude maximale.

Ajouter une extraction déterministe regex en fallback si l’IA n’extrait rien ou oublie des valeurs évidentes.

### 3. Durcir la validation : “timeline vide” devient erreur réparée, pas état accepté

Changer le flux final :

- validation IA ;
- retry IA ;
- réparation déterministe ;
- revalidation ;
- si toujours invalide : retourner une erreur claire au lieu d’un JSON vide silencieux.

Côté frontend, afficher un toast explicite si le moteur n’a pas pu produire de résolution, au lieu de montrer “0 étape” comme si tout allait bien.

### 4. Adapter le rendu dynamique sans créer un composant pour chaque cas

Conserver les scénarios existants, mais les rendre plus souples :

- `projectile` doit afficher force de traînée/friction si présente ;
- ajouter des dimensions utiles : `hmax`, portée/distance, sommet ;
- si l’exercice dépasse le rendu exact, afficher une scène “projectile enrichie” plutôt que rien ;
- éviter d’ajouter trop de composants spécialisés tant qu’un renderer générique force/dimension/annotation suffit.

### 5. Ajouter un banc de tests automatisé d’exercices générés

Créer des tests Deno pour les fonctions :

- générer ou utiliser une suite fixe d’exercices faciles/moyens/difficiles ;
- appeler `parse-exercise` ;
- vérifier systématiquement :
  - scénario reconnu ;
  - au moins 1 objet ;
  - au moins 2 forces mécaniques quand applicable ;
  - au moins 5 étapes ;
  - au moins une étape `solve` ;
  - aucun target de force orphelin ;
  - paramètres essentiels présents.

Inclure l’exercice projectile complexe que tu as donné comme test de régression.

### 6. Tester avant de te dire que c’est bon

Après implémentation :

- déployer la fonction corrigée ;
- tester directement `parse-exercise` sur ton exercice complexe ;
- tester au moins un exercice généré difficile ;
- vérifier que la réponse contient bien objets, forces, timeline et résultats ;
- ne valider que si la colonne résolution n’est plus vide.

## Fichiers probablement modifiés

- `supabase/functions/parse-exercise/index.ts`
- `src/lib/api.ts` si on ajoute un message d’erreur plus précis
- `src/pages/Index.tsx` pour éviter les toasts “succès” avec 0 étape
- `src/lib/physics/scenarios/projectile.ts` pour mieux dessiner frottement, sommet et annotations
- nouveaux tests sous `supabase/functions/parse-exercise/`

## Résultat attendu

Même si l’IA rend un JSON incomplet, le système reconstruit un plan cognitif exploitable : schéma non vide, forces cohérentes, résolution détaillée, et plus de “0 étape” silencieux.