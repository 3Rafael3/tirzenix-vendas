import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, CloudUpload, AlertTriangle, Check } from "lucide-react";
import { useStore } from "@/store/useStore";
import { isGistEnabled, pushToGist } from "@/lib/gistSync";
import { cn } from "@/lib/utils";

type State = "off" | "synced" | "pending" | "syncing" | "error";

const LS_LAST_SYNC = "tirzenix-last-sync";
const LS_LAST_HASH = "tirzenix-last-hash";

/**
 * Hash simples (FNV-1a 32-bit) — suficiente para detectar mudanças no payload.
 */
function quickHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

export function SyncStatusChip() {
  const exportJSON = useStore((s) => s.exportJSON);
  const sales = useStore((s) => s.sales);
  const reservations = useStore((s) => s.reservations);
  const products = useStore((s) => s.products);
  const clients = useStore((s) => s.clients);
  const movements = useStore((s) => s.movements);

  const [state, setState] = useState<State>(() => (isGistEnabled() ? "synced" : "off"));
  const [busy, setBusy] = useState(false);

  // Detecta mudança no store comparando hash
  useEffect(() => {
    if (!isGistEnabled()) {
      setState("off");
      return;
    }
    const currentHash = quickHash(exportJSON());
    const lastHash = localStorage.getItem(LS_LAST_HASH);
    if (!lastHash) {
      setState("pending");
    } else if (currentHash !== lastHash) {
      setState((prev) => (prev === "syncing" ? prev : "pending"));
    } else {
      setState((prev) => (prev === "syncing" ? prev : "synced"));
    }
  }, [sales, reservations, products, clients, movements, exportJSON]);

  async function pushNow() {
    if (busy || !isGistEnabled()) return;
    setBusy(true);
    setState("syncing");
    const payload = JSON.parse(exportJSON());
    const res = await pushToGist(payload);
    setBusy(false);
    if (res.ok) {
      localStorage.setItem(LS_LAST_SYNC, res.updatedAt);
      localStorage.setItem(LS_LAST_HASH, quickHash(JSON.stringify(payload)));
      setState("synced");
    } else {
      setState("error");
    }
  }

  if (state === "off") {
    return (
      <div className="mx-4 mb-1 inline-flex items-center gap-2 text-[10px] text-silver-500/70 select-none">
        <CloudOff size={11} />
        Sync local
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={pushNow}
      disabled={busy || state === "synced"}
      title={
        state === "synced"
          ? "Tudo sincronizado · clique para forçar push"
          : state === "pending"
          ? "Mudanças locais ainda não enviadas · clique para sincronizar"
          : state === "syncing"
          ? "Enviando para a nuvem..."
          : "Erro na última sincronização · clique para tentar novamente"
      }
      className={cn(
        "mx-3 mb-1 group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ring-1",
        state === "synced" && "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30 hover:bg-emerald-500/15",
        state === "pending" && "bg-gold-500/10 text-gold-300 ring-gold-500/30 hover:bg-gold-500/15",
        state === "syncing" && "bg-sky-500/10 text-sky-300 ring-sky-500/30",
        state === "error" && "bg-rose-500/10 text-rose-300 ring-rose-500/30 hover:bg-rose-500/15"
      )}
    >
      <AnimatePresence mode="wait">
        {state === "synced" && (
          <motion.span
            key="synced"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="inline-flex items-center gap-1.5"
          >
            <Check size={11} />
            <span>Sincronizado</span>
          </motion.span>
        )}
        {state === "pending" && (
          <motion.span
            key="pending"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="inline-flex items-center gap-1.5"
          >
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="size-1.5 rounded-full bg-gold-400"
            />
            <span>Mudanças pendentes</span>
          </motion.span>
        )}
        {state === "syncing" && (
          <motion.span
            key="syncing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="inline-flex items-center gap-1.5"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="inline-flex"
            >
              <CloudUpload size={11} />
            </motion.span>
            <span>Enviando…</span>
          </motion.span>
        )}
        {state === "error" && (
          <motion.span
            key="error"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="inline-flex items-center gap-1.5"
          >
            <AlertTriangle size={11} />
            <span>Erro · tentar de novo</span>
          </motion.span>
        )}
      </AnimatePresence>
      <Cloud size={11} className="ml-auto opacity-50 group-hover:opacity-100 transition" />
    </button>
  );
}
