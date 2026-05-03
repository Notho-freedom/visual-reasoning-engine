import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import type { TimelineStep } from "@/types/cognitive";

interface Props {
  step?: TimelineStep;
  index: number;
  speed?: number; // chars per second
  resetKey?: string | number; // change → wipe board
}

interface BoardLine {
  text: string;
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
    Object.entries(step.result).forEach(([k, v]) => lines.push({ text: `   ⟹ ${k} = ${v}`, stepIndex: idx }));
  }
  lines.push({ text: "", stepIndex: idx });
  return lines;
}

const BlackboardOverlay: React.FC<Props> = ({ step, index, speed = 70, resetKey }) => {
  const [lines, setLines] = useState<BoardLine[]>([]);
  const [typingLine, setTypingLine] = useState<{ full: string; out: string } | null>(null);
  const writtenStepsRef = useRef<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Reset on new exercise
  useEffect(() => {
    setLines([]);
    setTypingLine(null);
    writtenStepsRef.current.clear();
    setScrollOffset(0);
  }, [resetKey]);

  // Append step lines when a new step is reached
  useEffect(() => {
    if (!step) return;
    if (writtenStepsRef.current.has(index)) return;
    writtenStepsRef.current.add(index);

    const newLines = stepToLines(step, index);
    // Type the lines one after the other
    let i = 0;
    let cancelled = false;

    const typeNext = () => {
      if (cancelled) return;
      if (i >= newLines.length) {
        setTypingLine(null);
        return;
      }
      const ln = newLines[i];
      if (!ln.text || ln.divider || ln.text.length < 2) {
        setLines((prev) => [...prev, ln]);
        i++;
        typeNext();
        return;
      }
      let pos = 0;
      const interval = Math.max(8, 1000 / speed);
      setTypingLine({ full: ln.text, out: "" });
      const id = window.setInterval(() => {
        pos++;
        if (cancelled) { window.clearInterval(id); return; }
        setTypingLine({ full: ln.text, out: ln.text.slice(0, pos) });
        if (pos >= ln.text.length) {
          window.clearInterval(id);
          setLines((prev) => [...prev, ln]);
          i++;
          window.setTimeout(typeNext, 60);
        }
      }, interval);
    };
    typeNext();
    return () => { cancelled = true; };
  }, [step, index, speed]);

  // Auto-scroll: push old lines up when overflow
  useLayoutEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;
    const overflow = inner.scrollHeight - container.clientHeight;
    if (overflow > 0) {
      setScrollOffset(overflow + 8);
      // Trim very old lines once they've scrolled far off
      if (overflow > 400 && lines.length > 60) {
        setLines((prev) => prev.slice(prev.length - 50));
        setScrollOffset(0);
      }
    } else {
      setScrollOffset(0);
    }
  }, [lines, typingLine]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 px-10 py-8 pointer-events-none overflow-hidden"
      style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
    >
      <div
        ref={innerRef}
        className="text-[13px] leading-[1.7] text-foreground/85 transition-transform duration-500 ease-out"
        style={{ transform: `translateY(-${scrollOffset}px)` }}
      >
        {lines.length === 0 && !typingLine && (
          <div className="text-foreground/35 italic">
            ▸ Lancez l'animation pour voir la résolution s'écrire ici.
          </div>
        )}
        {lines.map((ln, i) => {
          const isCurrentStep = ln.stepIndex === index;
          return (
            <div
              key={i}
              className={
                ln.divider
                  ? "text-foreground/40 mt-2 mb-0.5"
                  : ln.muted
                    ? `text-foreground/55 ${isCurrentStep ? "font-medium text-foreground/75" : ""}`
                    : ln.bold
                      ? `font-semibold ${isCurrentStep ? "text-foreground" : "text-foreground/80"}`
                      : isCurrentStep ? "text-foreground" : "text-foreground/75"
              }
            >
              {ln.text || "\u00A0"}
            </div>
          );
        })}
        {typingLine && (
          <div className="text-foreground">
            {typingLine.out}
            <span className="inline-block w-1.5 h-3.5 bg-foreground/70 ml-0.5 align-middle animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};

export default BlackboardOverlay;
