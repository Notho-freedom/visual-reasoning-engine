import React, { useEffect, useState } from "react";
import type { TimelineStep } from "@/types/cognitive";
import { cn } from "@/lib/utils";

interface Props {
  step?: TimelineStep;
  index: number;
  speed?: number; // chars per second
}

/** Typewriter sur un seul texte composite, change quand step change. */
function useTypewriter(text: string, cps = 60) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    if (!text) return;
    let i = 0;
    const interval = Math.max(8, 1000 / cps);
    const id = window.setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, interval);
    return () => window.clearInterval(id);
  }, [text, cps]);
  return out;
}

const BlackboardOverlay: React.FC<Props> = ({ step, index, speed = 80 }) => {
  if (!step) return null;

  const lines: string[] = [];
  lines.push(`▸ ${step.title}`);
  if (step.formula) lines.push(`   ${step.formula}`);
  if (step.description) lines.push(`   ${step.description}`);
  if (step.result) {
    Object.entries(step.result).forEach(([k, v]) => lines.push(`   ${k} = ${v}`));
  }
  const fullText = lines.join("\n");
  const typed = useTypewriter(fullText + "\n", speed);

  return (
    <div
      key={`${step.id}-${index}`}
      className={cn(
        "absolute top-4 right-4 max-w-sm w-[min(360px,40%)]",
        "rounded-2xl bg-card/95 backdrop-blur-sm border border-border shadow-soft",
        "px-4 py-3 pointer-events-none animate-fade-in"
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-mono text-muted-foreground">étape {index + 1}</span>
        <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
          {step.type}
        </span>
      </div>
      <pre
        className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground font-mono"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {typed}
        <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 align-middle animate-pulse" />
      </pre>
    </div>
  );
};

export default BlackboardOverlay;
