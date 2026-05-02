import React, { useRef, useEffect } from "react";
import { ArrowUp, Loader2, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  messages: ChatMsg[];
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

const ChatPanel: React.FC<Props> = ({ messages, input, onInputChange, onSend, isLoading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-[12px] text-muted-foreground px-1 leading-relaxed">
            Demandez une modification du schéma : <em>"ajoute un résistor en parallèle"</em>,
            <em> "change la masse à 5kg"</em>, <em>"incline le plan à 45°"</em>…
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed border",
              m.role === "user"
                ? "bg-primary text-primary-foreground border-primary ml-6"
                : "bg-card text-foreground border-border mr-6"
            )}
          >
            <div className="flex items-center gap-1.5 mb-1 opacity-70">
              {m.role === "user" ? <User className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                {m.role === "user" ? "Vous" : "PhysicsEngine"}
              </span>
            </div>
            {m.content}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mr-6 px-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Recalcul du schéma…
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border/60">
        <form
          onSubmit={(e) => { e.preventDefault(); if (input.trim() && !isLoading) onSend(); }}
          className="bg-card rounded-2xl border border-border p-1.5 shadow-soft"
        >
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !isLoading) onSend();
              }
            }}
            placeholder="Modifier le schéma actuel…"
            rows={2}
            disabled={isLoading}
            className="w-full resize-none bg-transparent px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
