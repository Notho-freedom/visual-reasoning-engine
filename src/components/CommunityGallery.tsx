import React, { useState } from "react";
import { GALLERY, type GalleryItem } from "@/data/gallery";
import { ArrowUpRight } from "lucide-react";

interface Props {
  onPick: (prompt: string) => void;
}

const FILTERS = ["Populaires", "Mécanique", "Oscillations", "Cinématique", "Électricité"] as const;
type Filter = typeof FILTERS[number];

const CommunityGallery: React.FC<Props> = ({ onPick }) => {
  const [filter, setFilter] = useState<Filter>("Populaires");
  const items = filter === "Populaires" ? GALLERY : GALLERY.filter(g => g.category === filter);

  return (
    <section className="w-full max-w-6xl mx-auto px-6 py-20">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Depuis la communauté</h2>
          <p className="text-muted-foreground mt-2 text-base">
            Des exercices déjà résolus. Cliquez pour relancer la résolution.
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 text-sm rounded-full border transition-all ${
                filter === f
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-foreground/70 border-border hover:border-foreground/40 hover:text-foreground"
              }`}
            >{f}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((g: GalleryItem) => (
          <button
            key={g.id}
            onClick={() => onPick(g.prompt)}
            className="group text-left rounded-2xl border border-border bg-card p-5 hover:border-foreground/40 hover:shadow-elevated transition-all"
          >
            <div className="aspect-[16/9] rounded-xl gradient-hero-soft mb-4 flex items-center justify-center text-6xl font-mono text-foreground/30 group-hover:text-foreground/50 transition-colors">
              {g.preview}
            </div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{g.category}</div>
                <div className="font-semibold text-foreground truncate mt-0.5">{g.title}</div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-0.5" />
            </div>
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{g.prompt}</p>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CommunityGallery;
