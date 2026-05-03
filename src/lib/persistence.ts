import type { CognitiveJSON } from "@/types/cognitive";
import type { ChatMsg } from "@/components/ChatPanel";

const KEY_CURRENT = "pe.session.current";
const KEY_SESSIONS = "pe.sessions";
const MAX_SESSIONS = 20;

export interface HistoryItemSerial {
  id: string;
  label: string;
  timestamp: number;
  exercise: string;
  data: CognitiveJSON;
}

export interface SessionState {
  exercise: string;
  data: CognitiveJSON | null;
  constants: Record<string, number>;
  t: number;
  currentStep: number;
  chatMessages: ChatMsg[];
  history: HistoryItemSerial[];
  currentHistoryId?: string;
  updatedAt: number;
}

export interface SessionMeta {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
}

function safeRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
function safeWrite(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

export function loadCurrent(): SessionState | null {
  return safeRead<SessionState>(KEY_CURRENT);
}

export function saveCurrent(state: Omit<SessionState, "updatedAt">) {
  safeWrite(KEY_CURRENT, { ...state, updatedAt: Date.now() });
}

export function clearCurrent() {
  try { localStorage.removeItem(KEY_CURRENT); } catch { /* */ }
}

export function listSessions(): SessionMeta[] {
  return safeRead<SessionMeta[]>(KEY_SESSIONS) ?? [];
}

/** Archive current session into the sessions list. */
export function archiveCurrent(state: SessionState | null): SessionMeta | null {
  if (!state || !state.data) return null;
  const meta: SessionMeta = {
    id: `s-${Date.now()}`,
    title: state.data.meta?.title || state.data.meta?.scenario || "Sans titre",
    preview: state.exercise.slice(0, 120),
    updatedAt: Date.now(),
  };
  const list = listSessions();
  list.unshift(meta);
  safeWrite(KEY_SESSIONS, list.slice(0, MAX_SESSIONS));
  safeWrite(`pe.session.${meta.id}`, state);
  return meta;
}

export function loadSession(id: string): SessionState | null {
  return safeRead<SessionState>(`pe.session.${id}`);
}

export function deleteSession(id: string) {
  try { localStorage.removeItem(`pe.session.${id}`); } catch { /* */ }
  const list = listSessions().filter((s) => s.id !== id);
  safeWrite(KEY_SESSIONS, list);
}

let saveTimer: number | null = null;
export function debouncedSave(state: Omit<SessionState, "updatedAt">, ms = 500) {
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => saveCurrent(state), ms);
}
