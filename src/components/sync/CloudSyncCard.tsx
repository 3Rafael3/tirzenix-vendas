import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud,
  CloudOff,
  Download,
  Upload,
  Copy,
  Check,
  RefreshCw,
  KeyRound,
  Trash2,
  Info,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { toast } from "@/components/ui/Toast";
import {
  getStoredCreds,
  setStoredCreds,
  getWorkspaceCode,
  setWorkspaceCode,
  pullFromCloud,
  pushToCloud,
  isCloudEnabled,
} from "@/lib/cloudSync";

const SQL_SETUP = `-- Cole no SQL editor do seu projeto Supabase e execute uma vez:

create table if not exists workspaces (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table workspaces enable row level security;
create policy "open r/w by code"
  on workspaces for all
  using (true) with check (true);`;

export function CloudSyncCard() {
  const exportJSON = useStore((s) => s.exportJSON);
  const importJSON = useStore((s) => s.importJSON);

  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [showSQL, setShowSQL] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const c = getStoredCreds();
    if (c) {
      setUrl(c.url);
      setAnonKey(c.anonKey);
    }
    setCode(getWorkspaceCode());
  }, []);

  const enabled = isCloudEnabled();

  function saveCreds() {
    if (!url.trim() || !anonKey.trim()) {
      toast.error("Preencha URL e Anon Key");
      return;
    }
    if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
      toast.error("URL deve ser do tipo https://xxx.supabase.co");
      return;
    }
    setStoredCreds({ url: url.trim(), anonKey: anonKey.trim() });
    toast.success("Credenciais Supabase salvas");
  }

  function disconnect() {
    setStoredCreds(null);
    setUrl("");
    setAnonKey("");
    toast.info("Sync desativado · dados continuam locais");
  }

  function updateCode(c: string) {
    setWorkspaceCode(c);
    setCode(c.trim().toUpperCase());
  }

  async function doPull() {
    if (!enabled) return;
    setBusy(true);
    const res = await pullFromCloud();
    setBusy(false);
    if (!res.ok) {
      toast.error("Falha no pull: " + res.error);
      return;
    }
    if (!res.data) {
      toast.warn("Workspace vazio na nuvem ainda · faça um push primeiro");
      return;
    }
    const out = importJSON(JSON.stringify(res.data));
    if (out.ok) {
      setLastSync(res.updatedAt || new Date().toISOString());
      toast.success("Dados baixados da nuvem ✦");
    } else {
      toast.error("Erro ao aplicar: " + (out.error || "—"));
    }
  }

  async function doPush() {
    if (!enabled) return;
    setBusy(true);
    let payload: any = null;
    try {
      payload = JSON.parse(exportJSON());
    } catch (e: any) {
      setBusy(false);
      toast.error("Erro ao exportar: " + e.message);
      return;
    }
    const res = await pushToCloud(payload);
    setBusy(false);
    if (!res.ok) {
      toast.error("Falha no push: " + res.error);
      return;
    }
    setLastSync(res.updatedAt);
    toast.success("Dados enviados para a nuvem ✦");
  }

  async function copySQL() {
    try {
      await navigator.clipboard.writeText(SQL_SETUP);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("SQL copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código do workspace copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  }

  return (
    <div className="card p-6 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 size-48 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-semibold text-silver-50 flex items-center gap-2">
              {enabled ? (
                <Cloud size={20} className="text-sky-300" />
              ) : (
                <CloudOff size={20} className="text-silver-500" />
              )}
              Sincronização em nuvem
            </h3>
            <p className="text-sm text-silver-400 mt-1">
              Acesse seus dados de qualquer dispositivo (celular, tablet, outro PC).{" "}
              <strong className="text-silver-200">100% grátis</strong> usando Supabase.
            </p>
          </div>
          <span
            className={`badge text-[10px] ${
              enabled
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40"
                : "bg-silver-500/15 text-silver-300 ring-1 ring-silver-500/40"
            }`}
          >
            {enabled ? "Ativado" : "Desativado"}
          </span>
        </div>

        {/* Workspace code visível */}
        <div className="mt-5 rounded-xl bg-ink-950/60 border border-gold-900/25 px-4 py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-gold-400 font-semibold flex items-center gap-1">
                <KeyRound size={11} /> Código deste dispositivo
              </p>
              <p className="font-mono text-lg font-bold text-silver-50 mt-1 tracking-widest">
                {code || "—"}
              </p>
              <p className="text-[11px] text-silver-500 mt-1">
                Use este código no outro aparelho para acessar os mesmos dados.
              </p>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="btn-secondary text-xs shrink-0"
              title="Copiar"
            >
              <Copy size={12} /> Copiar
            </button>
          </div>
        </div>

        {/* Setup ou ações */}
        {!enabled ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-sky-500/[0.07] border border-sky-500/30 px-4 py-3 text-sm text-silver-200">
              <p className="font-semibold flex items-center gap-1.5 text-sky-300">
                <Info size={13} /> Como ativar em 3 passos:
              </p>
              <ol className="list-decimal pl-5 mt-2 space-y-1 text-xs text-silver-300">
                <li>
                  Crie conta grátis em{" "}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-gold-300 hover:underline"
                  >
                    supabase.com
                  </a>{" "}
                  e um novo projeto.
                </li>
                <li>
                  No SQL Editor, cole e execute o script abaixo (uma única vez).
                </li>
                <li>
                  Em <strong>Settings → API</strong>, copie a URL e a anon key e cole nos campos
                  abaixo.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowSQL((v) => !v)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-gold-300 hover:text-gold-200"
              >
                {showSQL ? "Esconder" : "Mostrar"} SQL
              </button>
              <AnimatePresence>
                {showSQL && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <pre className="mt-2 rounded-lg bg-ink-950 ring-1 ring-gold-900/30 p-3 text-[11px] font-mono text-silver-200 overflow-x-auto whitespace-pre">
                      {SQL_SETUP}
                    </pre>
                    <button
                      type="button"
                      onClick={copySQL}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-gold-300 hover:text-gold-200"
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                      {copied ? "Copiado!" : "Copiar SQL"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
              <label className="block">
                <span className="label">URL do projeto Supabase</span>
                <input
                  className="input font-mono text-xs"
                  placeholder="https://xxxxx.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="label">Anon Key</span>
                <input
                  className="input font-mono text-xs"
                  placeholder="eyJ..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={saveCreds}>
                <Cloud size={14} /> Conectar
              </button>
            </div>
          </div>
        ) : (
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

            <div className="rounded-xl bg-ink-950/40 border border-gold-900/20 px-3.5 py-2.5 text-[11px] text-silver-400 leading-relaxed">
              💡 <strong className="text-gold-300">Como usar em outro aparelho:</strong> abra o
              mesmo site nele, vá em Configurações → Sincronização, cole o código acima no
              campo "Acessar workspace" e clique em "Baixar nuvem".
            </div>

            <details className="group" open={showAdvanced} onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
              <summary className="text-[11px] text-silver-500 hover:text-silver-300 cursor-pointer">
                Opções avançadas
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block">
                    <span className="label">Acessar workspace existente (cole o código)</span>
                    <div className="flex gap-2">
                      <input
                        className="input font-mono uppercase tracking-widest"
                        placeholder="ABCDEFGHJKLM"
                        value={code}
                        onChange={(e) => updateCode(e.target.value)}
                        maxLength={20}
                      />
                      <button className="btn-secondary text-xs shrink-0" onClick={doPull}>
                        <Download size={12} /> Baixar
                      </button>
                    </div>
                    <p className="text-[10px] text-silver-500 mt-1">
                      Substitui o código local. Faça pull em seguida para puxar os dados desse
                      workspace.
                    </p>
                  </label>
                </div>
                <button
                  type="button"
                  className="btn-ghost text-xs text-rose-300 hover:bg-rose-500/10"
                  onClick={disconnect}
                >
                  <Trash2 size={12} /> Desconectar e apagar credenciais
                </button>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
