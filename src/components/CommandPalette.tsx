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
  User,
  Package,
  Phone,
} from "lucide-react";
import { useStore, getSaleFinancials } from "@/store/useStore";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { formatBRL, formatDate } from "@/lib/utils";

interface CmdItem {
  id: string;
  label: string;
  sub?: string;
  hint?: string;
  icon: React.ComponentType<any>;
  group: "Navegação" | "Ações" | "Vendas" | "Clientes" | "Produtos";
  run: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const nav = useNavigate();
  const exportJSON = useStore((s) => s.exportJSON);
  const sales = useStore((s) => s.sales);
  const clients = useStore((s) => s.clients);
  const products = useStore((s) => s.products);

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

  // Comandos fixos
  const fixed: CmdItem[] = useMemo(
    () => [
      { id: "dash", group: "Navegação", label: "Ir para Dashboard", icon: LayoutDashboard, hint: "G D", run: () => nav("/") },
      { id: "vendas", group: "Navegação", label: "Ir para Vendas", icon: ShoppingCart, hint: "G V", run: () => nav("/vendas") },
      { id: "reservas", group: "Navegação", label: "Ir para Reservas", icon: CalendarClock, hint: "G R", run: () => nav("/reservas") },
      { id: "clientes", group: "Navegação", label: "Ir para Clientes", icon: Users, hint: "G C", run: () => nav("/clientes") },
      { id: "estoque", group: "Navegação", label: "Ir para Estoque", icon: Boxes, hint: "G E", run: () => nav("/estoque") },
      { id: "relatorios", group: "Navegação", label: "Ir para Relatórios", icon: FileBarChart, run: () => nav("/relatorios") },
      { id: "config", group: "Navegação", label: "Ir para Configurações", icon: Settings, run: () => nav("/configuracoes") },
      { id: "guia", group: "Navegação", label: "Abrir Guia de uso", icon: BookOpen, run: () => nav("/guia") },
      { id: "new-sale", group: "Ações", label: "Nova venda", hint: "N V", icon: Plus, run: () => nav("/vendas?new=1") },
      { id: "new-res", group: "Ações", label: "Nova reserva", hint: "N R", icon: Plus, run: () => nav("/reservas?new=1") },
      { id: "new-prod", group: "Ações", label: "Novo produto", hint: "N P", icon: Plus, run: () => nav("/estoque?new=1") },
      {
        id: "backup",
        group: "Ações",
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

  // Resultados dinâmicos da busca (vendas, clientes, produtos)
  const dynamic: CmdItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const out: CmdItem[] = [];

    // Vendas (até 5)
    const matchedSales = sales
      .filter(
        (s) =>
          s.client.toLowerCase().includes(q) ||
          s.product.toLowerCase().includes(q) ||
          s.contact.toLowerCase().includes(q)
      )
      .slice(0, 5);
    for (const s of matchedSales) {
      const fin = getSaleFinancials(s);
      out.push({
        id: `sale-${s.id}`,
        group: "Vendas",
        label: `${s.client} · ${s.product} ${s.dosage}`,
        sub: `${formatDate(s.date)} · ${formatBRL(fin.totalSale)} · ${s.status}`,
        icon: ShoppingCart,
        run: () => nav("/vendas?cliente=" + encodeURIComponent(s.client)),
      });
    }

    // Clientes (até 5)
    const matchedClients = clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
      )
      .slice(0, 5);
    for (const c of matchedClients) {
      out.push({
        id: `client-${c.id}`,
        group: "Clientes",
        label: c.name,
        sub: c.phone || "sem telefone",
        icon: User,
        run: () => nav("/vendas?cliente=" + encodeURIComponent(c.name)),
      });
    }

    // Produtos (até 5)
    const matchedProducts = products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.dosage.toLowerCase().includes(q) ||
          (p.sku || "").toLowerCase().includes(q)
      )
      .slice(0, 5);
    for (const p of matchedProducts) {
      out.push({
        id: `product-${p.id}`,
        group: "Produtos",
        label: `${p.name} · ${p.dosage}`,
        sub: `Estoque ${p.stockQty} · ${formatBRL(p.salePrice)}`,
        icon: Package,
        run: () => nav("/estoque"),
      });
    }

    return out;
  }, [query, sales, clients, products, nav]);

  // Combinar e filtrar
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let combined: CmdItem[] = [...dynamic];
    const fixedFiltered = !q
      ? fixed
      : fixed.filter((i) => i.label.toLowerCase().includes(q));
    combined = [...combined, ...fixedFiltered];
    return combined;
  }, [query, fixed, dynamic]);

  // Agrupa por categoria preservando ordem
  const grouped = useMemo(() => {
    const groups: { name: string; items: CmdItem[] }[] = [];
    for (const it of filtered) {
      let g = groups.find((x) => x.name === it.group);
      if (!g) {
        g = { name: it.group, items: [] };
        groups.push(g);
      }
      g.items.push(it);
    }
    return groups;
  }, [filtered]);

  function runItem(item: CmdItem) {
    item.run();
    setOpen(false);
  }

  // Index flatten para keyboard navigation
  const flatIndex = useMemo(() => {
    const arr: CmdItem[] = [];
    for (const g of grouped) arr.push(...g.items);
    return arr;
  }, [grouped]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] sm:pt-[16vh] px-4">
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
                placeholder="Buscar comandos, clientes, vendas, produtos…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(flatIndex.length - 1, a + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(0, a - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (flatIndex[active]) runItem(flatIndex[active]);
                  }
                }}
              />
              <kbd className="hidden sm:inline-flex text-[10px] text-silver-500 bg-ink-800 px-1.5 py-0.5 rounded border border-ink-600">
                ESC
              </kbd>
            </div>

            <ul className="max-h-[55vh] overflow-y-auto p-2 space-y-1">
              {flatIndex.length === 0 && (
                <li className="text-center text-sm text-silver-500 py-10">
                  Nenhum resultado para "<strong className="text-silver-300">{query}</strong>"
                </li>
              )}
              {grouped.map((g) => (
                <li key={g.name}>
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-gold-400/70">
                    {g.name}
                  </div>
                  <ul className="space-y-0.5">
                    {g.items.map((it) => {
                      const Icon = it.icon;
                      const realIdx = flatIndex.indexOf(it);
                      const isActive = realIdx === active;
                      return (
                        <li key={it.id}>
                          <button
                            onMouseEnter={() => setActive(realIdx)}
                            onClick={() => runItem(it)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition text-left",
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
                            <span className="flex-1 min-w-0">
                              <div className="font-medium truncate">{it.label}</div>
                              {it.sub && (
                                <div className="text-[11px] text-silver-500 truncate">
                                  {it.sub}
                                </div>
                              )}
                            </span>
                            {it.hint && (
                              <kbd className="text-[10px] text-silver-500 bg-ink-800 px-1.5 py-0.5 rounded font-mono">
                                {it.hint}
                              </kbd>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between px-4 py-2.5 bg-ink-950/70 border-t border-ink-700/60 text-[11px] text-silver-500">
              <div className="flex items-center gap-3 flex-wrap">
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
