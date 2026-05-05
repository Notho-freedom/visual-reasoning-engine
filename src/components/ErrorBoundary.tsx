import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface State { error: Error | null; }

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  reload = () => {
    try { localStorage.removeItem("physics:current"); } catch {}
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-lg w-full bg-card border border-border rounded-2xl shadow-elevated p-6 space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-base font-semibold">Une erreur est survenue</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            L'application a rencontré un problème. Vous pouvez réessayer ou
            réinitialiser la session locale.
          </p>
          <pre className="text-[11px] font-mono bg-secondary rounded-lg p-3 max-h-40 overflow-auto text-foreground/70">
            {this.state.error.message}
          </pre>
          <div className="flex gap-2 justify-end">
            <button
              onClick={this.reset}
              className="h-9 px-4 rounded-full text-xs font-medium border border-border hover:bg-secondary transition"
            >
              Réessayer
            </button>
            <button
              onClick={this.reload}
              className="h-9 px-4 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser la session
            </button>
          </div>
        </div>
      </div>
    );
  }
}
