import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingCart,
  CalendarClock,
  Users,
  Boxes,
  FileBarChart,
  Settings,
  BookOpen,
  Plus,
  Search,
  Command,
  Download,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface CmdItem {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<any>;
  run: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const nav = useNavigate();
  const exportJSON = useStore((s) => s.exportJSON);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const items: CmdItem[] = useMemo(
    () => [
      { id: "dash", label: "Ir para Dashboard", icon: LayoutDashboard, run: () => nav("/") },
      { id: "vendas", label: "Ir para Vendas", icon: ShoppingCart, run: () => nav("/vendas") },
      { id: "reservas", label: "Ir para Reservas", icon: CalendarClock, run: () => nav("/reservas") },
      { id: "clientes", label: "Ir para Clientes", icon: Users, run: () => nav("/clientes") },
      { id: "estoque", label: "Ir para Estoque", icon: Boxes, run: () => nav("/estoque") },
      { id: "relatorios", label: "Ir para Relatórios", icon: FileBarChart, run: () => nav("/relatorios") },
      { id: "config", label: "Ir para Configurações", icon: Settings, run: () => nav("/configuracoes") },
      { id: "guia", label: "Abrir Guia de uso", icon: BookOpen, run: () => nav("/guia") },
      { id: "new-sale", label: "Nova venda", hint: "atalho", icon: Plus, run: () => nav("/vendas?new=1") },
      { id: "new-res", label: "Nova reserva", hint: "atalho", icon: Plus, run: () => nav("/reservas?new=1") },
      { id: "new-prod", label: "Novo produto", hint: "atalho", icon: Plus, run: () => nav("/estoque?new=1") },
      {
        id: "backup",
        label: "Exportar backup (JSON)",
        icon: Download,
        run: () => {
          const json = exportJSON();
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `tirzenix-backup-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success("Backup baixado");
        },
      },
    ],
    [nav, exportJSON]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, query]);

  function runItem(item: CmdItem) {
    item.run();
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[16vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative w-full max-w-xl bg-ink-900/95 backdrop-blur-xl rounded-2xl shadow-ring border border-gold-800/30 overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gold-gradient" />
            <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-700/60">
              <Search size={18} className="text-gold-400" />
              <input
                autoFocus
                className="flex-1 bg-transparent outline-none text-sm text-silver-50 placeholder:text-silver-500"
                placeholder="Buscar comandos, navegação…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(filtered.length - 1, a + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(0, a - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (filtered[active]) runItem(filtered[active]);
                  }
                }}
              />
              <kbd className="hidden sm:inline-flex text-[10px] text-silver-500 bg-ink-800 px-1.5 py-0.5 rounded border border-ink-600">
                ESC
              </kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {filtered.length === 0 && (
                <li className="text-center text-sm text-silver-500 py-10">
                  Nenhum comando encontrado.
                </li>
              )}
              {filtered.map((it, i) => {
                const Icon = it.icon;
                const isActive = i === active;
                return (
                  <li key={it.id}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => runItem(it)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition",
                        isActive
                          ? "bg-gold-800/30 text-gold-100 ring-1 ring-gold-700/40"
                          : "text-silver-200 hover:bg-ink-800/60"
                      )}
                    >
                      <span
                        className={cn(
                          "size-8 rounded-lg grid place-items-center shrink-0",
                          isActive
                            ? "bg-gold-700/40 text-gold-200"
                            : "bg-ink-800 text-silver-400"
                        )}
                      >
                        <Icon size={15} />
                      </span>
                      <span className="flex-1 text-left font-medium">{it.label}</span>
                      {it.hint && (
                        <span className="text-[10px] text-silver-500 uppercase tracking-wider">
                          {it.hint}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between px-4 py-2.5 bg-ink-950/70 border-t border-ink-700/60 text-[11px] text-silver-500">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Command size={11} /> + K para abrir
                </span>
                <span>↑↓ navegar</span>
                <span>↵ executar</span>
              </div>
              <span className="font-display tracking-wider gold-text">TIRZENIX</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
