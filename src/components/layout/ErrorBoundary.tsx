import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Bug } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("🔥 ErrorBoundary caught:", error, info);
    this.setState({ error, info });
  }

  reset = () => this.setState({ error: null, info: null });

  hardReset = () => {
    try {
      localStorage.removeItem("tirzenix-vendas");
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const msg = this.state.error.message || String(this.state.error);
    const stack = this.state.info?.componentStack || this.state.error.stack || "";
    return (
      <div className="card-gold p-6 my-6 max-w-3xl mx-auto">
        <div className="flex items-start gap-3">
          <span className="size-10 rounded-xl bg-rose-500/15 text-rose-300 grid place-items-center ring-1 ring-rose-500/40 shrink-0">
            <AlertTriangle size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold text-silver-50">
              Algo deu errado nesta página
            </h2>
            <p className="text-sm text-silver-400 mt-1">
              Capturamos o erro pra você ver e me reportar. Seus dados estão seguros.
            </p>

            <div className="mt-4 rounded-xl bg-ink-950/60 border border-rose-500/30 px-3 py-2.5 font-mono text-xs text-rose-200 break-words whitespace-pre-wrap">
              {msg}
            </div>

            {stack && (
              <details className="mt-3">
                <summary className="text-[11px] text-silver-500 cursor-pointer hover:text-silver-300 inline-flex items-center gap-1">
                  <Bug size={11} /> Stack trace técnico
                </summary>
                <pre className="mt-2 rounded-lg bg-ink-950/80 ring-1 ring-gold-900/30 p-3 text-[10px] font-mono text-silver-400 overflow-x-auto max-h-64 whitespace-pre-wrap">
                  {stack}
                </pre>
              </details>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={this.reset}>
                <RotateCcw size={14} /> Tentar de novo
              </button>
              <button
                className="btn-secondary"
                onClick={() => (window.location.href = ".")}
              >
                Voltar pro Dashboard
              </button>
              <button
                className="btn-ghost text-rose-300 hover:bg-rose-500/10"
                onClick={() => {
                  if (
                    confirm(
                      "Resetar dados locais? (Faça backup primeiro em Configurações)"
                    )
                  ) {
                    this.hardReset();
                  }
                }}
              >
                Reset local
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
