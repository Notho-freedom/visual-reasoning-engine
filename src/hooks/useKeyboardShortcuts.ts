import { useEffect } from "react";

export interface ShortcutHandlers {
  onPlayToggle?: () => void;
  onReset?: () => void;
  onLoopToggle?: () => void;
  onPrevStep?: () => void;
  onNextStep?: () => void;
  onSyncToggle?: () => void;
  onForcesToggle?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onToggleParams?: () => void;
  onToggleChat?: () => void;
  onToggleHistory?: () => void;
  onShowHelp?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

const isTypingTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
};

export function useKeyboardShortcuts(h: ShortcutHandlers) {
  useEffect(() => {
    if (h.enabled === false) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") { h.onEscape?.(); return; }
      if (isTypingTarget(e.target)) return;

      switch (e.key) {
        case " ":
          e.preventDefault(); h.onPlayToggle?.(); break;
        case "r": case "R":
          h.onReset?.(); break;
        case "l": case "L":
          h.onLoopToggle?.(); break;
        case "ArrowLeft":
          h.onPrevStep?.(); break;
        case "ArrowRight":
          h.onNextStep?.(); break;
        case "s": case "S":
          h.onSyncToggle?.(); break;
        case "f": case "F":
          h.onForcesToggle?.(); break;
        case "+": case "=":
          h.onZoomIn?.(); break;
        case "-": case "_":
          h.onZoomOut?.(); break;
        case "0":
          h.onZoomReset?.(); break;
        case "p": case "P":
          h.onToggleParams?.(); break;
        case "c": case "C":
          h.onToggleChat?.(); break;
        case "h": case "H":
          h.onToggleHistory?.(); break;
        case "?":
          h.onShowHelp?.(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [h]);
}
