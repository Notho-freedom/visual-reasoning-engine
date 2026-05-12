// Galerie d'exercices "communauté" affichée sur la home (statique pour le MVP).
export interface GalleryItem {
  id: string;
  title: string;
  category: "Mécanique" | "Oscillations" | "Électricité" | "Cinématique";
  scenario: string;
  prompt: string;
  preview: string; // emoji/symbole simple en attendant des vignettes SVG
}

export const GALLERY: GalleryItem[] = [
  { id: "g1", title: "Chute libre 20 m",            category: "Mécanique",   scenario: "free_fall",       prompt: "Un objet de 2 kg est lâché sans vitesse initiale d'une hauteur de 20 m. Calculer le temps de chute et la vitesse à l'arrivée.", preview: "↓" },
  { id: "g2", title: "Plan incliné 30°, μ=0.2",     category: "Mécanique",   scenario: "inclined_plane",  prompt: "Un bloc de 5 kg glisse sur un plan incliné de 30° avec un coefficient de frottement μ=0.2. Déterminer l'accélération.", preview: "◣" },
  { id: "g3", title: "Plan + poulie",               category: "Mécanique",   scenario: "inclined_pulley", prompt: "Un bloc de 2 kg est sur un plan incliné de 30°, relié par une corde sur une poulie idéale à une masse suspendue de 1 kg. μ=0.2. Trouver l'accélération et la tension.", preview: "⫶◣" },
  { id: "g4", title: "Projectile 45°, v=20 m/s",    category: "Cinématique", scenario: "projectile",      prompt: "Un projectile est lancé à 20 m/s avec un angle de 45°. Calculer la portée et la hauteur maximale.", preview: "↗" },
  { id: "g5", title: "Poulie d'Atwood 3 / 5 kg",    category: "Mécanique",   scenario: "pulley",          prompt: "Deux masses 3 kg et 5 kg reliées par une corde sur une poulie. Calculer l'accélération.", preview: "○" },
  { id: "g6", title: "Ressort k=200 N/m",           category: "Oscillations",scenario: "spring",          prompt: "Un ressort k=200 N/m est comprimé de 10 cm avec une masse de 1 kg. Calculer l'énergie potentielle et la période.", preview: "〰" },
  { id: "g7", title: "Pendule L=1.5 m, θ=25°",      category: "Oscillations",scenario: "pendulum",        prompt: "Un pendule de longueur 1.5 m est lâché à 25°. Calculer la période et la vitesse maximale.", preview: "◜" },
  { id: "g8", title: "Circuit RC 12 V, 100 Ω",      category: "Électricité", scenario: "circuit",         prompt: "Un circuit comporte une batterie de 12 V en série avec une résistance de 100 Ω et un condensateur de 10 µF. Décrire le régime transitoire.", preview: "⚡" },
  { id: "g9", title: "Tir horizontal d'une falaise",category: "Cinématique", scenario: "projectile",      prompt: "Une bille est lancée horizontalement à 15 m/s depuis le haut d'une falaise de 25 m. Calculer la portée et la vitesse à l'impact.", preview: "→↓" },
  { id: "g10",title: "Ressort vertical suspendu",   category: "Oscillations",scenario: "spring",          prompt: "Une masse de 0.5 kg est suspendue à un ressort vertical de constante k=80 N/m. Étudier les oscillations autour de l'équilibre.", preview: "↕" },
  { id: "g11",title: "Bloc tracté sur sol",         category: "Mécanique",   scenario: "horizontal_motion",prompt:"Un bloc de 4 kg est tracté horizontalement par une force de 20 N sur un sol avec frottement μ=0.15. Calculer l'accélération.", preview: "→" },
  { id: "g12",title: "Pendule 50 cm, θ=10°",        category: "Oscillations",scenario: "pendulum",        prompt: "Un pendule simple de 50 cm est écarté de 10° puis lâché. Donner la période et l'équation du mouvement.", preview: "◞" },
];
