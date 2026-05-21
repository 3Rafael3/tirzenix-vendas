import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Users,
  TrendingUp,
  TrendingDown,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Calendar,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Sparkles,
  Crown,
  ShoppingCart,
  Download,
  X,
  ArrowRight,
} from "lucide-react";
import { useStore, getSaleFinancials } from "@/store/useStore";
import { PageHeader } from "@/components/layout/PageHeader";
import { Empty } from "@/components/ui/Empty";
import { Modal } from "@/components/ui/Modal";
import { ClientForm } from "@/components/forms/ClientForm";
import { toast } from "@/components/ui/Toast";
import { formatBRL, formatDate, formatNum, formatPct } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types";

interface ClientRow {
  id: string;
  name: string;
  phone: string;
  registered: boolean;
  createdAt?: string;
  orders: number;
  units: number;
  revenue: number;
  netRevenue: number;
  cost: number;
  profit: number;
  margin: number;
  lastDate: string;
}

type SortField = "name" | "orders" | "revenue" | "profit" | "margin" | "lastDate";
type SortDir = "asc" | "desc";
type FilterPreset = "all" | "withSales" | "ghosts" | "vips" | "loss";

const filterPresets: { id: FilterPreset; label: string; icon: any }[] = [
  { id: "all", label: "Todos", icon: Users },
  { id: "withSales", label: "Com vendas", icon: ShoppingCart },
  { id: "ghosts", label: "Sem cadastro", icon: AlertTriangle },
  { id: "vips", label: "VIPs (3+)", icon: Crown },
  { id: "loss", label: "Prejuízo", icon: TrendingDown },
];

export default function Clientes() {
  const navigate = useNavigate();
  const clients = useStore((s) => s.clients);
  const sales = useStore((s) => s.sales);
  const addClient = useStore((s) => s.addClient);
  const updateClient = useStore((s) => s.updateClient);
  const deleteClient = useStore((s) => s.deleteClient);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [confirmDel, setConfirmDel] = useState<Client | null>(null);
  const [confirmBulkDel, setConfirmBulkDel] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortField>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<FilterPreset>("all");

  // Constrói rows
  const allRows = useMemo<ClientRow[]>(() => {
    const map = new Map<string, ClientRow>();

    for (const c of clients) {
      map.set(c.name.toLowerCase(), {
        id: c.id,
        name: c.name,
        phone: c.phone,
        registered: true,
        createdAt: c.createdAt,
        orders: 0,
        units: 0,
        revenue: 0,
        netRevenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
        lastDate: "",
      });
    }

    for (const s of sales) {
      const key = s.client.trim().toLowerCase();
      if (!key) continue;
      const f = getSaleFinancials(s);
      const existing = map.get(key);
      if (existing) {
        existing.orders += 1;
        existing.units += s.qty;
        existing.revenue += f.totalSale;
        existing.netRevenue += f.netReceived;
        existing.cost += f.totalPurchase;
        existing.profit += f.netProfit;
        if (s.date > existing.lastDate) existing.lastDate = s.date;
        if (s.contact && !existing.phone) existing.phone = s.contact;
      } else {
        map.set(key, {
          id: `ghost-${key}`,
          name: s.client,
          phone: s.contact,
          registered: false,
          orders: 1,
          units: s.qty,
          revenue: f.totalSale,
          netRevenue: f.netReceived,
          cost: f.totalPurchase,
          profit: f.netProfit,
          margin: 0,
          lastDate: s.date,
        });
      }
    }

    return Array.from(map.values()).map((r) => ({
      ...r,
      margin: r.netRevenue ? r.profit / r.netRevenue : 0,
    }));
  }, [clients, sales]);

  // Filtra
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const qDigits = ql.replace(/\D/g, "");
    return allRows.filter((r) => {
      // Preset filters
      if (filter === "withSales" && r.orders === 0) return false;
      if (filter === "ghosts" && r.registered) return false;
      if (filter === "vips" && r.orders < 3) return false;
      if (filter === "loss" && r.profit >= 0) return false;
      // Search
      if (!ql) return true;
      const phoneMatch =
        qDigits.length > 0 && r.phone.replace(/\D/g, "").includes(qDigits);
      return r.name.toLowerCase().includes(ql) || phoneMatch;
    });
  }, [allRows, q, filter]);

  // Ordena
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name, "pt-BR");
          break;
        case "orders":
          cmp = a.orders - b.orders;
          break;
        case "revenue":
          cmp = a.revenue - b.revenue;
          break;
        case "profit":
          cmp = a.profit - b.profit;
          break;
        case "margin":
          cmp = a.margin - b.margin;
          break;
        case "lastDate":
          cmp = (a.lastDate || "").localeCompare(b.lastDate || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  // Stats globais (filtrados)
  const summary = useMemo(
    () => ({
      total: clients.length,
      ghosts: allRows.filter((r) => !r.registered).length,
      vips: allRows.filter((r) => r.orders >= 3).length,
      loss: allRows.filter((r) => r.orders > 0 && r.profit < 0).length,
      revenue: filtered.reduce((a, r) => a + r.revenue, 0),
      profit: filtered.reduce((a, r) => a + r.profit, 0),
      avgMargin: avgMargin(filtered),
    }),
    [clients, allRows, filtered]
  );

  // Stats dos selecionados
  const selStats = useMemo(() => {
    const items = sorted.filter((r) => selected.has(r.id));
    let revenue = 0,
      netRevenue = 0,
      cost = 0,
      profit = 0,
      orders = 0;
    for (const r of items) {
      revenue += r.revenue;
      netRevenue += r.netRevenue;
      cost += r.cost;
      profit += r.profit;
      orders += r.orders;
    }
    return {
      count: items.length,
      registeredCount: items.filter((r) => r.registered).length,
      revenue,
      netRevenue,
      cost,
      profit,
      orders,
      margin: netRevenue ? profit / netRevenue : 0,
    };
  }, [sorted, selected]);

  // Seleção
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map((r) => r.id)));
  }
  function clearSelection() {
    setSelected(new Set());
  }
  const allSelected = selected.size > 0 && selected.size === sorted.length;
  const someSelected = selected.size > 0 && selected.size < sorted.length;

  function handleSave(data: Omit<Client, "id" | "createdAt">) {
    if (editing) {
      updateClient(editing.id, data);
      toast.success("Cliente atualizado");
    } else {
      addClient(data);
      toast.success("Cliente cadastrado");
    }
    setOpen(false);
    setEditing(null);
  }

  function registerGhost(row: ClientRow) {
    addClient({ name: row.name, phone: row.phone });
    toast.success(`${row.name} cadastrado`);
  }

  function bulkDelete() {
    const items = sorted.filter((r) => selected.has(r.id) && r.registered);
    items.forEach((r) => deleteClient(r.id));
    toast.success(`${items.length} cliente(s) excluído(s)`);
    setSelected(new Set());
    setConfirmBulkDel(false);
  }

  function exportSelected() {
    const items = sorted.filter((r) => selected.has(r.id));
    if (items.length === 0) {
      toast.warn("Nenhum cliente selecionado");
      return;
    }
    const headers = [
      "Cliente", "Telefone", "Cadastrado", "Compras", "Unidades",
      "Receita Bruta", "Receita Líquida", "Custo", "Lucro Líquido",
      "Margem", "Última Compra",
    ];
    const rows = items.map((r) => [
      r.name, r.phone, r.registered ? "Sim" : "Não",
      r.orders, r.units, r.revenue, r.netRevenue, r.cost, r.profit,
      `${(r.margin * 100).toFixed(2)}%`,
      r.lastDate || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => {
        const v = String(c ?? "");
        return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tirzenix-clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  function viewSalesOfFirstSelected() {
    const first = sorted.find((r) => selected.has(r.id));
    if (!first) return;
    navigate(`/vendas?cliente=${encodeURIComponent(first.name)}`);
  }

  function setSort(field: SortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  return (
    <div className={cn(selected.size > 0 && "pb-40 lg:pb-32")}>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro + histórico consolidado · seleção múltipla · margens e prejuízos"
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={16} /> Novo cliente
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Summary label="Cadastrados" value={formatNum(summary.total)} icon={Users} />
        <Summary
          label="VIPs"
          value={formatNum(summary.vips)}
          icon={Crown}
          tone="gold"
          hint="3+ compras"
        />
        <Summary
          label="Prejuízo"
          value={formatNum(summary.loss)}
          icon={TrendingDown}
          tone={summary.loss > 0 ? "rose" : undefined}
        />
        <Summary label="Receita total" value={formatBRL(summary.revenue)} tone="gold" />
        <Summary
          label="Margem média"
          value={formatPct(summary.avgMargin)}
          icon={TrendingUp}
          tone={summary.avgMargin >= 0 ? "emerald" : "rose"}
        />
      </div>

      {/* Filtros + busca */}
      <div className="card p-3 mb-4 flex flex-col gap-2.5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-500" />
          <input
            className="input pl-9"
            placeholder="Buscar cliente, telefone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filterPresets.map((fp) => {
            const Icon = fp.icon;
            const isActive = filter === fp.id;
            return (
              <button
                key={fp.id}
                type="button"
                onClick={() => setFilter(fp.id)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium tracking-tight transition",
                  isActive ? "text-gold-100" : "text-silver-400 hover:text-silver-100"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="cli-filter"
                    className="absolute inset-0 rounded-lg bg-gold-500/15 ring-1 ring-gold-500/40"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative inline-flex items-center gap-1.5">
                  <Icon size={11} />
                  {fp.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-900/80 backdrop-blur sticky top-0 z-10">
              <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-silver-500">
                <th className="px-3 py-3 w-10">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    aria-label="Selecionar todos"
                  />
                </th>
                <Th field="name" sortBy={sortBy} sortDir={sortDir} onClick={setSort}>
                  Cliente
                </Th>
                <th className="px-4 py-3 font-semibold">Telefone</th>
                <Th field="orders" sortBy={sortBy} sortDir={sortDir} onClick={setSort} align="right">
                  Compras
                </Th>
                <Th field="revenue" sortBy={sortBy} sortDir={sortDir} onClick={setSort} align="right">
                  Receita
                </Th>
                <Th field="profit" sortBy={sortBy} sortDir={sortDir} onClick={setSort} align="right">
                  Lucro líq.
                </Th>
                <Th field="margin" sortBy={sortBy} sortDir={sortDir} onClick={setSort} align="right">
                  Margem
                </Th>
                <Th field="lastDate" sortBy={sortBy} sortDir={sortDir} onClick={setSort}>
                  Última
                </Th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-900/15">
              <AnimatePresence initial={false}>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-0">
                      <Empty
                        icon={Users}
                        title="Nenhum cliente"
                        description={
                          q || filter !== "all"
                            ? "Tente limpar os filtros ou ajustar a busca."
                            : "Cadastre seu primeiro cliente ou registre uma venda — o cliente é criado automaticamente."
                        }
                        action={
                          !q && filter === "all" ? (
                            <button
                              className="btn-primary"
                              onClick={() => {
                                setEditing(null);
                                setOpen(true);
                              }}
                            >
                              <Plus size={16} /> Cadastrar cliente
                            </button>
                          ) : null
                        }
                      />
                    </td>
                  </tr>
                )}
                {sorted.map((r, i) => {
                  const client = clients.find((c) => c.id === r.id);
                  const isSelected = selected.has(r.id);
                  const isVip = r.orders >= 3;
                  const isLoss = r.orders > 0 && r.profit < 0;
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.15) }}
                      className={cn(
                        "transition group cursor-pointer",
                        isSelected
                          ? "bg-gold-500/[0.08]"
                          : "hover:bg-gold-500/[0.04]"
                      )}
                      onClick={() => toggleOne(r.id)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleOne(r.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "size-9 rounded-full grid place-items-center text-[11px] font-bold ring-1 shrink-0",
                              isVip
                                ? "bg-gold-gradient text-ink-950 ring-gold-300/60 shadow-glow-sm"
                                : r.registered
                                ? "bg-gold-700/30 text-gold-200 ring-gold-700/50"
                                : "bg-ink-800 text-silver-400 ring-ink-600"
                            )}
                          >
                            {initials(r.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-silver-50 truncate">
                                {r.name}
                              </span>
                              {isVip && (
                                <motion.span
                                  initial={{ scale: 0.6, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="badge bg-gold-500/15 text-gold-200 ring-1 ring-gold-500/40 text-[9px]"
                                >
                                  <Crown size={9} /> VIP
                                </motion.span>
                              )}
                              {isLoss && (
                                <motion.span
                                  initial={{ scale: 0.6, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="badge bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40 text-[9px]"
                                >
                                  <AlertTriangle size={9} /> PREJUÍZO
                                </motion.span>
                              )}
                              {!r.registered && (
                                <span className="text-[9px] uppercase tracking-wider bg-silver-700/30 text-silver-300 px-1.5 py-0.5 rounded">
                                  sem cadastro
                                </span>
                              )}
                            </div>
                            {r.createdAt && r.registered && (
                              <div className="text-[10px] text-silver-500 flex items-center gap-1">
                                <Calendar size={9} />
                                Desde {formatDate(r.createdAt)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.phone ? (
                          <a
                            href={`tel:${r.phone.replace(/\D/g, "")}`}
                            className="inline-flex items-center gap-1.5 text-silver-200 hover:text-gold-300 transition font-mono text-sm tabular-nums"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={11} className="text-gold-400" />
                            {r.phone}
                          </a>
                        ) : (
                          <span className="text-silver-500 italic text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-silver-200 tabular-nums font-mono">
                        {r.orders}
                        <div className="text-[10px] text-silver-500">{r.units} un.</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-silver-50 tabular-nums font-mono">
                        {formatBRL(r.revenue)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right tabular-nums font-mono font-medium",
                          r.profit > 0
                            ? "text-emerald-300"
                            : r.profit < 0
                            ? "text-rose-300"
                            : "text-silver-400"
                        )}
                      >
                        {r.orders > 0 ? formatBRL(r.profit) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.orders > 0 ? <MarginPill margin={r.margin} /> : <span className="text-silver-500 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-silver-400 whitespace-nowrap">
                        {r.lastDate ? formatDate(r.lastDate) : "—"}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition">
                          {r.orders > 0 && (
                            <button
                              className="p-1.5 rounded-lg text-silver-400 hover:bg-gold-500/10 hover:text-gold-300 transition"
                              onClick={() =>
                                navigate(`/vendas?cliente=${encodeURIComponent(r.name)}`)
                              }
                              title="Ver vendas deste cliente"
                            >
                              <ArrowRight size={15} />
                            </button>
                          )}
                          {!r.registered ? (
                            <button
                              className="px-2 py-1 rounded-md text-[10px] uppercase tracking-wider bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/40 hover:bg-gold-500/25 transition"
                              onClick={() => registerGhost(r)}
                              title="Cadastrar este cliente"
                            >
                              + cadastrar
                            </button>
                          ) : (
                            <>
                              <button
                                className="p-1.5 rounded-lg text-silver-400 hover:bg-gold-500/10 hover:text-gold-300 transition"
                                onClick={() => {
                                  if (client) {
                                    setEditing(client);
                                    setOpen(true);
                                  }
                                }}
                                title="Editar"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                className="p-1.5 rounded-lg text-silver-400 hover:bg-rose-500/15 hover:text-rose-300 transition"
                                onClick={() => client && setConfirmDel(client)}
                                title="Excluir"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-x-3 bottom-3 lg:inset-x-auto lg:left-1/2 lg:bottom-4 lg:-translate-x-1/2 lg:w-auto lg:max-w-[min(72rem,calc(100vw-2rem))] z-40"
          >
            <div className="card-gold bg-ink-900/95 backdrop-blur-xl px-4 py-3 shadow-glow flex flex-col lg:flex-row lg:items-center gap-3 max-h-[80vh] overflow-y-auto">
              <div className="flex items-start lg:items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={clearSelection}
                    className="size-7 rounded-lg bg-gold-500/15 text-gold-300 hover:bg-gold-500/25 grid place-items-center transition"
                    title="Limpar seleção"
                  >
                    <X size={14} />
                  </button>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gold-400 font-semibold">
                      Selecionados
                    </p>
                    <p className="text-sm font-bold text-silver-50 tabular-nums">
                      {selStats.count}{" "}
                      <span className="text-silver-500 text-xs font-normal">
                        ({selStats.orders} compra{selStats.orders === 1 ? "" : "s"})
                      </span>
                    </p>
                  </div>
                </div>
                <span className="hidden lg:block w-px h-8 bg-gold-900/40 shrink-0" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 flex-1 min-w-0">
                  <SumStat label="Bruto" value={formatBRL(selStats.revenue)} />
                  <SumStat label="Custo" value={formatBRL(selStats.cost)} tone="silver" />
                  <SumStat
                    label="Lucro líq."
                    value={formatBRL(selStats.profit)}
                    tone={selStats.profit >= 0 ? "emerald" : "rose"}
                  />
                  <SumStat
                    label="Margem"
                    value={selStats.orders > 0 ? formatPct(selStats.margin) : "—"}
                    tone={selStats.margin >= 0 ? "gold" : "rose"}
                  />
                </div>
              </div>
              <div className="lg:ml-auto flex flex-wrap items-center gap-2 shrink-0 border-t border-gold-900/30 pt-3 lg:border-0 lg:pt-0">
                {selStats.count === 1 && (
                  <button className="btn-secondary text-xs" onClick={viewSalesOfFirstSelected}>
                    <ArrowRight size={13} /> Ver vendas
                  </button>
                )}
                <button className="btn-secondary text-xs" onClick={exportSelected}>
                  <Download size={13} /> CSV
                </button>
                {selStats.registeredCount > 0 && (
                  <button
                    className="btn-danger text-xs"
                    onClick={() => setConfirmBulkDel(true)}
                  >
                    <Trash2 size={13} /> Excluir ({selStats.registeredCount})
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modais */}
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? "Editar cliente" : "Novo cliente"}
        description="Apenas nome e telefone — simples e rápido."
        size="md"
      >
        <ClientForm
          initial={editing || undefined}
          onSubmit={handleSave}
          onCancel={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Excluir cliente"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmDel(null)}>
              Cancelar
            </button>
            <button
              className="btn-danger"
              onClick={() => {
                if (confirmDel) {
                  deleteClient(confirmDel.id);
                  toast.success("Cliente excluído");
                  setConfirmDel(null);
                }
              }}
            >
              Excluir
            </button>
          </>
        }
      >
        <p className="text-sm text-silver-300">
          Excluir <strong className="text-gold-300">{confirmDel?.name}</strong> do cadastro? As vendas dele permanecem registradas, mas ele não aparecerá no autocompletar.
        </p>
      </Modal>

      <Modal
        open={confirmBulkDel}
        onClose={() => setConfirmBulkDel(false)}
        title="Excluir selecionados"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmBulkDel(false)}>
              Cancelar
            </button>
            <button className="btn-danger" onClick={bulkDelete}>
              Excluir {selStats.registeredCount}
            </button>
          </>
        }
      >
        <p className="text-sm text-silver-300">
          Excluir <strong className="text-gold-300">{selStats.registeredCount}</strong> cliente(s) cadastrado(s)? As vendas associadas <strong>permanecem</strong>. "Sem cadastro" não podem ser excluídos.
        </p>
      </Modal>
    </div>
  );
}

// ──────────────────────────────────────
function avgMargin(rows: ClientRow[]): number {
  const withSales = rows.filter((r) => r.orders > 0);
  if (withSales.length === 0) return 0;
  return withSales.reduce((a, r) => a + r.margin, 0) / withSales.length;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function MarginPill({ margin }: { margin: number }) {
  const pct = margin * 100;
  const tone =
    pct < 0
      ? "bg-rose-500/15 text-rose-300 ring-rose-500/40"
      : pct < 5
      ? "bg-silver-500/15 text-silver-200 ring-silver-500/30"
      : pct < 15
      ? "bg-gold-500/15 text-gold-300 ring-gold-500/40"
      : pct < 30
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40"
      : "bg-emerald-500/25 text-emerald-200 ring-emerald-500/50";
  const Icon = pct < 0 ? TrendingDown : pct >= 30 ? Sparkles : TrendingUp;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold tabular-nums font-mono ring-1",
        tone
      )}
    >
      <Icon size={10} />
      {formatPct(margin)}
    </span>
  );
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  ...rest
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "checked" | "onChange" | "type">) {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => el && (el.indeterminate = !!indeterminate && !checked)}
        onChange={onChange}
        className="peer sr-only"
        {...rest}
      />
      <span
        className={cn(
          "size-4 rounded border transition flex items-center justify-center",
          checked
            ? "bg-gold-gradient border-gold-600 shadow-glow-sm"
            : indeterminate
            ? "bg-gold-500/30 border-gold-500/60"
            : "bg-ink-900 border-ink-600 hover:border-gold-700"
        )}
      >
        {checked && (
          <svg
            className="size-3 text-ink-950"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3.5,8.5 6.5,11.5 12.5,5" />
          </svg>
        )}
        {indeterminate && !checked && (
          <span className="block w-2 h-0.5 bg-gold-100 rounded" />
        )}
      </span>
    </label>
  );
}

function Th({
  field,
  sortBy,
  sortDir,
  onClick,
  align = "left",
  children,
}: {
  field: SortField;
  sortBy: SortField;
  sortDir: SortDir;
  onClick: (f: SortField) => void;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const active = field === sortBy;
  return (
    <th
      className={cn(
        "px-4 py-3 font-semibold select-none",
        align === "right" && "text-right"
      )}
    >
      <button
        type="button"
        onClick={() => onClick(field)}
        className={cn(
          "inline-flex items-center gap-1 transition hover:text-gold-300",
          active ? "text-gold-300" : "text-silver-500",
          align === "right" && "flex-row-reverse"
        )}
      >
        {children}
        <span className="inline-flex flex-col items-center justify-center -my-1">
          {active ? (
            sortDir === "asc" ? (
              <ChevronUp size={11} />
            ) : (
              <ChevronDown size={11} />
            )
          ) : (
            <ChevronDown size={11} className="opacity-30" />
          )}
        </span>
      </button>
    </th>
  );
}

function SumStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "rose" | "silver" | "gold";
}) {
  const t =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "rose"
      ? "text-rose-300"
      : tone === "silver"
      ? "text-silver-200"
      : tone === "gold"
      ? "text-gold-300"
      : "text-silver-50";
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.16em] text-silver-500 font-semibold">
        {label}
      </p>
      <p className={cn("text-sm font-bold tabular-nums font-mono mt-0.5", t)}>{value}</p>
    </div>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<any>;
  tone?: "emerald" | "gold" | "silver" | "rose";
  hint?: string;
}) {
  const t =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "gold"
      ? "text-gold-300"
      : tone === "silver"
      ? "text-silver-300"
      : tone === "rose"
      ? "text-rose-300"
      : "text-silver-50";
  const iconBg =
    tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
      : tone === "rose"
      ? "bg-rose-500/15 text-rose-300 ring-rose-500/40"
      : "bg-gold-500/15 text-gold-300 ring-gold-700/30";
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="card p-4 flex items-center justify-between"
    >
      <div>
        <p className="text-[10px] font-semibold text-gold-400/90 uppercase tracking-[0.12em]">
          {label}
        </p>
        <p className={cn("font-display text-xl font-bold mt-1 tabular-nums font-mono", t)}>
          {value}
        </p>
        {hint && (
          <p className="text-[10px] text-silver-500 mt-0.5">{hint}</p>
        )}
      </div>
      {Icon && (
        <span className={cn("size-9 rounded-xl grid place-items-center ring-1", iconBg)}>
          <Icon size={18} />
        </span>
      )}
    </motion.div>
  );
}
