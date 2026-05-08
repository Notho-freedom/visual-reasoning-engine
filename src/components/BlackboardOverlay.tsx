import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import type { CognitiveJSON, TimelineStep } from "@/types/cognitive";
import { recomputeStepResult } from "@/lib/physics/recompute";

interface Props {
  step?: TimelineStep;
  index: number;
  data?: CognitiveJSON | null;
  constants?: Record<string, number>;
  speed?: number; // chars per second
  resetKey?: string | number; // change → wipe board
}

interface BoardLine {
  text?: string;          // texte statique (titre, formule, description, divider)
  resultKey?: string;     // si défini : ligne "⟹ key = <valeur live>"
  bold?: boolean;
  muted?: boolean;
  divider?: boolean;
  stepIndex: number;
  isHeader?: boolean;
}

function stepToLines(step: TimelineStep, idx: number): BoardLine[] {
  const lines: BoardLine[] = [];
  lines.push({
    text: `─── Étape ${idx + 1} · ${step.type} ───`,
    divider: true,
    stepIndex: idx,
    isHeader: true,
  });
  lines.push({ text: step.title, bold: true, stepIndex: idx });
  if (step.formula) lines.push({ text: `   ${step.formula}`, stepIndex: idx });
  if (step.description) lines.push({ text: `   ${step.description}`, muted: true, stepIndex: idx });
  if (step.result) {
    Object.keys(step.result).forEach((k) => lines.push({ resultKey: k, stepIndex: idx }));
  }
  lines.push({ text: "", stepIndex: idx });
  return lines;
}

const BlackboardOverlay: React.FC<Props> = ({ step, index, data, constants, speed = 70, resetKey }) => {
  const [lines, setLines] = useState<BoardLine[]>([]);
  const [typingLine, setTypingLine] = useState<{ full: string; out: string } | null>(null);
  const writtenStepsRef = useRef<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Map stepIndex -> résultats live (recalculés à chaque changement de constants)
  const liveResultsByStep = useMemo(() => {
    const out: Record<number, Record<string, string | number>> = {};
    if (!data || !constants) return out;
    data.timeline.forEach((s, i) => {
      const r = recomputeStepResult(data, s, constants);
      if (r) out[i] = r;
    });
    return out;
  }, [data, constants]);

  // Reset on new exercise
  useEffect(() => {
    setLines([]);
    setTypingLine(null);
    writtenStepsRef.current.clear();
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [resetKey]);

  // Append step lines when a new step is reached
  useEffect(() => {
    if (!step) return;
    if (writtenStepsRef.current.has(index)) return;
    writtenStepsRef.current.add(index);

    const newLines = stepToLines(step, index);
    let i = 0;
    let cancelled = false;

    // Pour le typing d'une ligne resultKey, on a besoin de la valeur initiale
    const renderLineText = (ln: BoardLine): string => {
      if (ln.text !== undefined) return ln.text;
      if (ln.resultKey) {
        const v = liveResultsByStep[ln.stepIndex]?.[ln.resultKey] ?? step.result?.[ln.resultKey] ?? "";
        return `   ⟹ ${ln.resultKey} = ${v}`;
      }
      return "";
    };

    const typeNext = () => {
      if (cancelled) return;
      if (i >= newLines.length) { setTypingLine(null); return; }
      const ln = newLines[i];
      const txt = renderLineText(ln);
      if (!txt || ln.divider || txt.length < 2) {
        setLines((prev) => [...prev, ln]);
        i++;
        typeNext();
        return;
      }
      let pos = 0;
      const interval = Math.max(8, 1000 / speed);
      setTypingLine({ full: txt, out: "" });
      const id = window.setInterval(() => {
        pos++;
        if (cancelled) { window.clearInterval(id); return; }
        setTypingLine({ full: txt, out: txt.slice(0, pos) });
        if (pos >= txt.length) {
          window.clearInterval(id);
          setLines((prev) => [...prev, ln]);
          i++;
          window.setTimeout(typeNext, 60);
        }
      }, interval);
    };
    typeNext();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, index, speed]);

  // Auto-scroll vers le bas (scroll natif invisible)
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [lines, typingLine]);

  // Helper d'affichage live d'une ligne déjà écrite
  const renderStored = (ln: BoardLine, fallback?: TimelineStep): string => {
    if (ln.text !== undefined) return ln.text;
    if (ln.resultKey) {
      const v = liveResultsByStep[ln.stepIndex]?.[ln.resultKey]
        ?? fallback?.result?.[ln.resultKey] ?? "";
      return `   ⟹ ${ln.resultKey} = ${v}`;
    }
    return "";
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 px-10 pt-8 pb-16 overflow-y-auto overflow-x-hidden blackboard-scroll"
      style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
    >
      <div
        ref={innerRef}
        className="text-[13px] leading-[1.7] text-foreground/85 min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
      >
        {lines.length === 0 && !typingLine && (
          <div className="text-foreground/35 italic">
            ▸ Lancez l'animation pour voir la résolution s'écrire ici.
          </div>
        )}
        {lines.map((ln, i) => {
          const isCurrentStep = ln.stepIndex === index;
          const txt = renderStored(ln, ln.stepIndex === index ? step : undefined);
          const isLive = !!ln.resultKey;
          return (
            <div
              key={i}
              className={
                `min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                  ln.divider
                  ? "text-foreground/40 mt-2 mb-0.5"
                  : ln.muted
                    ? `text-foreground/55 ${isCurrentStep ? "font-medium text-foreground/75" : ""}`
                    : ln.bold
                      ? `font-semibold ${isCurrentStep ? "text-foreground" : "text-foreground/80"}`
                      : isLive
                        ? `text-primary/90 ${isCurrentStep ? "text-primary" : ""}`
                        : isCurrentStep ? "text-foreground" : "text-foreground/75"
                }`
              }
            >
              {txt || "\u00A0"}
            </div>
          );
        })}
        {typingLine && (
          <div className="text-foreground min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {typingLine.out}
            <span className="inline-block w-1.5 h-3.5 bg-foreground/70 ml-0.5 align-middle animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};

export default BlackboardOverlay;
