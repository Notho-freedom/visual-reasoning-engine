import { useCallback, useRef, useState } from "react";
import { parseExercise } from "@/lib/api";
import type { CognitiveJSON } from "@/types/cognitive";

export type QueueStatus = "pending" | "parsing" | "ready" | "error";

export interface QueuedExercise {
  id: string;
  title: string;
  statement: string;
  status: QueueStatus;
  data?: CognitiveJSON;
  error?: string;
}

/**
 * Worker séquentiel: traite les exercices un par un (jamais en parallèle pour
 * ménager la cascade gratuite OpenRouter).
 */
export function useExerciseQueue() {
  const [exercises, setExercises] = useState<QueuedExercise[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const runningRef = useRef(false);

  const updateOne = useCallback((id: string, patch: Partial<QueuedExercise>) => {
    setExercises(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const processNext = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      // Re-read state at each iteration via functional setter pattern
      // Loop: find a "pending" exercise, mark "parsing", call parse, mark "ready"
      while (true) {
        let target: QueuedExercise | undefined;
        setExercises(prev => {
          target = prev.find(e => e.status === "pending");
          if (!target) return prev;
          return prev.map(e => (e.id === target!.id ? { ...e, status: "parsing" } : e));
        });
        if (!target) break;
        try {
          const data = await parseExercise(target.statement);
          updateOne(target.id, { status: "ready", data });
        } catch (e) {
          updateOne(target.id, {
            status: "error",
            error: e instanceof Error ? e.message : "Erreur inconnue",
          });
        }
      }
    } finally {
      runningRef.current = false;
    }
  }, [updateOne]);

  const setQueue = useCallback((items: Array<{ title: string; statement: string }>) => {
    const list: QueuedExercise[] = items.map((it, i) => ({
      id: `q-${Date.now()}-${i}`,
      title: it.title,
      statement: it.statement,
      status: "pending",
    }));
    setExercises(list);
    setActiveId(list[0]?.id ?? null);
    // Kick off processing
    setTimeout(processNext, 0);
  }, [processNext]);

  const reset = useCallback(() => {
    setExercises([]);
    setActiveId(null);
  }, []);

  return { exercises, activeId, setActiveId, setQueue, reset };
}
