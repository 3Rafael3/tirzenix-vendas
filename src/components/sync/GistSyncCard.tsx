import { useEffect, useState } from "react";
import {
  Cloud,
  CloudOff,
  Download,
  Upload,
  Copy,
  RefreshCw,
  KeyRound,
  Trash2,
  Info,
  ExternalLink,
  Github,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { toast } from "@/components/ui/Toast";
import {
  getToken,
  setToken,
  getGistId,
  setGistId,
  isGistEnabled,
  pullFromGist,
  pushToGist,
  getUser,
} from "@/lib/gistSync";

const TOKEN_LINK =
  "https://github.com/settings/tokens/new?scopes=gist&description=tirzenix-sync";

export function GistSyncCard() {
  const exportJSON = useStore((s) => s.exportJSON);
  const importJSON = useStore((s) => s.importJSON);

  const [token, setTokenInput] = useState("");
  const [gistId, setGistIdInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [user, setUserInfo] = useState<{ login: string; avatar_url: string } | null>(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    setTokenInput(getToken());
    setGistIdInput(getGistId());
    if (isGistEnabled()) {
      getUser().then(setUserInfo);
    }
  }, []);

  const enabled = !!token.trim();

  async function connect() {
    if (!token.trim()) {
      toast.error("Cole seu Personal Access Token primeiro");
      return;
    }
    setBusy(true);
    setToken(token.trim());
    const u = await getUser();
    setBusy(false);
    if (!u) {
      setToken(null);
      toast.error("Token inválido ou sem permissão de gist");
      return;
    }
    setUserInfo(u);
    toast.success(`Conectado como ${u.login} ✦`);
  }

  function disconnect() {
    setToken(null);
    setGistId(null);
    setTokenInput("");
    setGistIdInput("");
    setUserInfo(null);
    toast.info("Sync GitHub desativado · dados locais preservados");
  }

  async function doPush() {
    setBusy(true);
    let payload: any;
    try {
      payload = JSON.parse(exportJSON());
    } catch (e: any) {
      setBusy(false);
      toast.error("Erro ao exportar: " + e.message);
      return;
    }
    const res = await pushToGist(payload);
    setBusy(false);
    if (!res.ok) {
      toast.error("Falha no push: " + res.error);
      return;
    }
    setGistIdInput(res.gistId);
    setLastSync(res.updatedAt);
    toast.success("Dados enviados pra nuvem ✦");
  }

  async function doPull() {
    setBusy(true);
    const res = await pullFromGist();
    setBusy(false);
    if (!res.ok) {
      toast.error("Falha no pull: " + res.error);
      return;
    }
    const out = importJSON(JSON.stringify(res.data));
    if (out.ok) {
      setLastSync(res.updatedAt);
      setGistIdInput(getGistId());
      toast.success("Dados baixados da nuvem ✦");
    } else {
      toast.error("Erro ao aplicar: " + (out.error || "—"));
    }
  }

  function applyGistId() {
    setGistId(gistId.trim() || null);
    toast.success("Gist ID atualizado · clique em Baixar pra puxar");
  }

  async function copyGistId() {
    if (!gistId) return;
    try {
      await navigator.clipboard.writeText(gistId);
      toast.success("Gist ID copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  }

  return (
    <div className="card p-5 sm:p-6 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 size-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-semibold text-silver-50 flex items-center gap-2 flex-wrap">
              {enabled ? (
                <Cloud size={20} className="text-emerald-300" />
              ) : (
                <CloudOff size={20} className="text-silver-500" />
              )}
              Sincronização via GitHub
            </h3>
            <p className="text-sm text-silver-400 mt-1">
              Acesse seus dados de qualquer aparelho usando um <strong>Gist privado</strong> da sua conta GitHub. Sem servidor, sem cadastro novo.
            </p>
          </div>
          <span
            className={`badge text-[10px] shrink-0 ${
              enabled
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40"
                : "bg-silver-500/15 text-silver-300 ring-1 ring-silver-500/40"
            }`}
          >
            {enabled ? "Ativado" : "Desativado"}
          </span>
        </div>

        {!enabled && (
          <div className="mt-5 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/30 px-4 py-3 text-sm text-silver-200">
            <p className="font-semibold flex items-center gap-1.5 text-emerald-300">
              <Info size={13} /> Como ativar em 30 segundos:
            </p>
            <ol className="list-decimal pl-5 mt-2 space-y-1.5 text-xs text-silver-300">
              <li>
                Clique no botão abaixo (abre o GitHub já com tudo preenchido) →{" "}
                <strong className="text-gold-300">"Generate token"</strong>
              </li>
              <li>Copie o token que aparece (começa com <code className="font-mono text-gold-200">ghp_</code>)</li>
              <li>Cole no campo abaixo e clique em <strong>Conectar</strong></li>
            </ol>
            <a
              href={TOKEN_LINK}
              target="_blank"
              rel="noreferrer"
              className="btn-primary mt-3 inline-flex !no-underline"
            >
              <Github size={14} /> Criar token no GitHub <ExternalLink size={12} />
            </a>
            <p className="text-[11px] text-silver-500 mt-3 leading-relaxed">
              💡 Escopo já vem marcado como <code className="font-mono text-gold-300">gist</code> — o sistema só consegue ler/escrever os seus gists. Nenhum outro acesso à sua conta.
            </p>
          </div>
        )}

        {/* Connected user */}
        {enabled && user && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-ink-950/60 border border-emerald-500/20 px-3 py-2">
            <img
              src={user.avatar_url}
              alt={user.login}
              className="size-9 rounded-full ring-1 ring-gold-700/40"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-silver-50">{user.login}</p>
              <p className="text-[11px] text-silver-500">Conectado ao GitHub</p>
            </div>
          </div>
        )}

        {/* Campo Token */}
        <label className="block mt-4">
          <span className="label flex items-center gap-1.5">
            <KeyRound size={11} /> Personal Access Token
          </span>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showToken ? "text" : "password"}
                className="input font-mono pr-9"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setTokenInput(e.target.value)}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-silver-500 hover:text-gold-300"
                tabIndex={-1}
                aria-label="Mostrar/esconder token"
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              className="btn-primary text-xs shrink-0"
              onClick={connect}
              disabled={busy || !token.trim()}
            >
              {busy ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
              {enabled ? "Reverificar" : "Conectar"}
            </button>
          </div>
          <p className="text-[11px] text-silver-500 mt-1.5">
            O token fica salvo apenas <strong>neste dispositivo</strong>. Nunca enviamos para servidores nossos.
          </p>
        </label>

        {/* Ações */}
        {enabled && (
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                className="btn-primary justify-center"
                onClick={doPush}
                disabled={busy}
              >
                {busy ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                Enviar deste aparelho → Nuvem
              </button>
              <button
                className="btn-secondary justify-center"
                onClick={doPull}
                disabled={busy}
              >
                {busy ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                Baixar Nuvem → Este aparelho
              </button>
            </div>

            {lastSync && (
              <p className="text-[11px] text-silver-500 text-center">
                Última sync:{" "}
                <strong className="text-silver-200 font-mono">
                  {new Date(lastSync).toLocaleString("pt-BR")}
                </strong>
              </p>
            )}

            {gistId && (
              <div className="rounded-xl bg-ink-950/60 border border-gold-900/25 px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gold-400 font-semibold">
                      Gist ID do backup
                    </p>
                    <p className="font-mono text-xs text-silver-200 mt-0.5 truncate">{gistId}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      className="size-7 rounded-md bg-ink-800 hover:bg-gold-500/15 text-silver-400 hover:text-gold-300 grid place-items-center transition"
                      onClick={copyGistId}
                      title="Copiar"
                    >
                      <Copy size={12} />
                    </button>
                    <a
                      href={`https://gist.github.com/${gistId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="size-7 rounded-md bg-ink-800 hover:bg-gold-500/15 text-silver-400 hover:text-gold-300 grid place-items-center transition"
                      title="Abrir no GitHub"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-ink-950/40 border border-gold-900/20 px-3.5 py-2.5 text-[11px] text-silver-400 leading-relaxed">
              💡 <strong className="text-gold-300">No celular:</strong> abra o mesmo site, vá em Configurações → Sincronização → cole o mesmo token (ou crie outro com escopo gist) → <strong>Baixar Nuvem</strong>. O sistema acha seu gist sozinho.
            </div>

            <details className="group">
              <summary className="text-[11px] text-silver-500 hover:text-silver-300 cursor-pointer select-none">
                Opções avançadas
              </summary>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="label">Gist ID específico (forçar)</span>
                  <div className="flex gap-2">
                    <input
                      className="input font-mono text-xs"
                      placeholder="ex: 1a2b3c4d5e6f7g8h9i0j"
                      value={gistId}
                      onChange={(e) => setGistIdInput(e.target.value)}
                    />
                    <button className="btn-secondary text-xs shrink-0" onClick={applyGistId}>
                      Salvar
                    </button>
                  </div>
                  <p className="text-[10px] text-silver-500 mt-1">
                    Use isso para apontar para um gist específico (ex: compartilhado entre múltiplos PATs).
                  </p>
                </label>
                <button
                  type="button"
                  className="btn-ghost text-xs text-rose-300 hover:bg-rose-500/10"
                  onClick={disconnect}
                >
                  <Trash2 size={12} /> Desconectar e apagar token deste aparelho
                </button>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

