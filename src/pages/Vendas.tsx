import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Download,
  Filter,
  ShoppingCart,
  Eye,
  Wallet,
  CreditCard,
  Sparkles,
  ChevronUp,
  ChevronDown,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useStore, getSaleFinancials } from "@/store/useStore";
import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { SaleForm } from "@/components/forms/SaleForm";
import { SaleDetail } from "@/components/sales/SaleDetail";
import { toast } from "@/components/ui/Toast";
import { floatMoney } from "@/components/effects/FloatingMoney";
import { Empty } from "@/components/ui/Empty";
import { formatBRL, formatDate, formatNum, formatPct, monthKey, todayISO } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Sale, SaleStatus } from "@/lib/types";

type QuickFilter = "all" | "thisMonth" | "paid" | "pending" | "card" | "withSignal" | "loss";

const quickFilters: { id: QuickFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "thisMonth", label: "Este mês" },
  { id: "paid", label: "Pagas" },
  { id: "pending", label: "Pendentes" },
  { id: "card", label: "No cartão" },
  { id: "withSignal", label: "Com sinal" },
  { id: "loss", label: "Prejuízo" },
];

type SortField = "date" | "client" | "product" | "gross" | "net" | "profit" | "margin";
type SortDir = "asc" | "desc";

export default function Vendas() {
  const sales = useStore((s) => s.sales);
  const addSale = useStore((s) => s.addSale);
  const updateSale = useStore((s) => s.updateSale);
  const deleteSale = useStore((s) => s.deleteSale);
  const settings = useStore((s) => s.settings);

  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [quick, setQuick] = useState<QuickFilter>("all");
  const [editing, setEditing] = useState<Sale | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Sale | null>(null);
  const [confirmBulkDel, setConfirmBulkDel] = useState(false);
  const [detail, setDetail] = useState<Sale | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    if (params.get("new") === "1") {
      setEditing(null);
      setOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
    const cli = params.get("cliente");
    if (cli) {
      setQuery(cli);
      params.delete("cliente");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const thisMonth = monthKey(todayISO());
    return sales.filter((s) => {
      try {
        if (!s || !s.id) return false;
        if (statusFilter && s.status !== statusFilter) return false;
        if (quick === "thisMonth" && monthKey(s.date || "") !== thisMonth) return false;
        if (quick === "paid" && s.status !== "Pago") return false;
        if (quick === "pending" && s.status !== "Pendente" && s.status !== "Parcelado") return false;
        if (quick === "card" && s.payment !== "Cartão Crédito") return false;
        if (quick === "withSignal" && !s.signal?.amount) return false;
        if (quick === "loss" && getSaleFinancials(s).netProfit >= 0) return false;
        if (!q) return true;
        return (
          (s.client || "").toLowerCase().includes(q) ||
          (s.product || "").toLowerCase().includes(q) ||
          ((s as any).productVariant || "").toLowerCase().includes(q) ||
          (s.contact || "").toLowerCase().includes(q) ||
          (s.dosage || "").toLowerCase().includes(q)
        );
      } catch (err) {
        console.warn("[Vendas] erro ao filtrar venda:", err, s);
        return false;
      }
    });
  }, [sales, query, statusFilter, quick]);

  // Sort — defensivo contra registros parcialmente formados
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      try {
        const fa = getSaleFinancials(a);
        const fb = getSaleFinancials(b);
        let cmp = 0;
        switch (sortBy) {
          case "date":
            cmp = (a.date || "").localeCompare(b.date || "");
            break;
          case "client":
            cmp = (a.client || "").localeCompare(b.client || "", "pt-BR");
            break;
          case "product":
            cmp = (a.product || "").localeCompare(b.product || "", "pt-BR");
            break;
          case "gross":
            cmp = fa.totalSale - fb.totalSale;
            break;
          case "net":
            cmp = fa.netReceived - fb.netReceived;
            break;
          case "profit":
            cmp = fa.netProfit - fb.netProfit;
            break;
          case "margin":
            cmp = fa.netMargin - fb.netMargin;
            break;
        }
        return sortDir === "asc" ? cmp : -cmp;
      } catch (err) {
        console.warn("[Vendas] erro ao comparar vendas:", err, { a, b });
        return 0;
      }
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const totals = useMemo(() => {
    let gross = 0,
      net = 0,
      profit = 0,
      fees = 0,
      cost = 0,
      units = 0;
    for (const s of sorted) {
      const f = getSaleFinancials(s);
      gross += f.totalSale;
      net += f.netReceived;
      profit += f.netProfit;
      fees += f.totalFees;
      cost += f.totalPurchase;
      units += s.qty;
    }
    return { gross, net, profit, fees, cost, units };
  }, [sorted]);

  // Stats dos selecionados
  const selStats = useMemo(() => {
    const items = sorted.filter((s) => selected.has(s.id));
    let gross = 0,
      net = 0,
      profit = 0,
      fees = 0,
      cost = 0,
      units = 0,
      withSignal = 0,
      onCard = 0,
      paid = 0,
      pending = 0;
    for (const s of items) {
      const f = getSaleFinancials(s);
      gross += f.totalSale;
      net += f.netReceived;
      profit += f.netProfit;
      fees += f.totalFees;
      cost += f.totalPurchase;
      units += s.qty;
      if (s.signal?.amount) withSignal += 1;
      if (s.payment === "Cartão Crédito") onCard += 1;
      if (s.status === "Pago") paid += 1;
      if (s.status === "Pendente" || s.status === "Parcelado") pending += 1;
    }
    return {
      count: items.length,
      gross,
      net,
      profit,
      fees,
      cost,
      units,
      withSignal,
      onCard,
      paid,
      pending,
      margin: net ? profit / net : 0,
      ticketAvg: items.length ? gross / items.length : 0,
      items,
    };
  }, [sorted, selected]);

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
    else setSelected(new Set(sorted.map((s) => s.id)));
  }
  const allSelected = selected.size > 0 && selected.size === sorted.length;
  const someSelected = selected.size > 0 && selected.size < sorted.length;

  function setSort(field: SortField) {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  function handleSave(data: Omit<Sale, "id">) {
    if (editing) {
      updateSale(editing.id, data);
      toast.success("Venda atualizada");
    } else {
      addSale(data);
      toast.success("Venda registrada");
      // Microinteração luxuosa: número volante com o líquido recebido
      const fin = getSaleFinancials({ ...data, id: "tmp" } as Sale);
      floatMoney(fin.netReceived, { tone: fin.netProfit >= 0 ? "emerald" : "rose" });
    }
    setOpen(false);
    setEditing(null);
  }

  function bulkSetStatus(status: SaleStatus) {
    selStats.items.forEach((s) => updateSale(s.id, { status }));
    toast.success(`${selStats.items.length} venda(s) marcadas como "${status}"`);
  }

  function bulkDelete() {
    selStats.items.forEach((s) => deleteSale(s.id));
    toast.success(`${selStats.items.length} venda(s) excluída(s)`);
    setSelected(new Set());
    setConfirmBulkDel(false);
  }

  function exportRows(rowsToExport: Sale[], filenamePrefix: string) {
    const headers = [
      "Data", "Produto", "Dosagem", "Cliente", "Contato", "Qtd",
      "Preço Compra", "Preço Venda", "Total Bruto",
      "Sinal", "Método Sinal", "Pagamento", "Parcelas",
      "Taxa Cartão", "Taxa Parcelamento", "Outras Taxas", "Total Taxas",
      "Valor Líquido", "Custo", "Lucro Líquido", "Margem Líquida",
      "Status", "Mês", "Observações",
    ];
    const rows = rowsToExport.map((s) => {
      const f = getSaleFinancials(s);
      return [
        s.date, s.product, s.dosage, s.client, s.contact, s.qty,
        s.purchasePrice, s.salePrice, f.totalSale,
        f.signalAmount, f.signalMethod, s.payment, f.installments,
        f.cardFee, f.installmentFee, f.otherFees, f.totalFees,
        f.netReceived, f.totalPurchase, f.netProfit, `${(f.netMargin * 100).toFixed(2)}%`,
        s.status, s.date.slice(0, 7), s.notes || "",
      ];
    });
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((c) => {
          const v = String(c ?? "");
          return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        }).join(";")
      ).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  return (
    <div className={cn(selected.size > 0 && "pb-40 lg:pb-32")}>
      <PageHeader
        title="Vendas"
        subtitle="Registro completo · seleção múltipla · totais e margem ao vivo"
        actions={
          <>
            <button
              className="btn-secondary"
              onClick={() => exportRows(sorted, "tirzenix-vendas")}
              disabled={sorted.length === 0}
            >
              <Download size={16} /> Exportar
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus size={16} /> Nova venda
            </button>
          </>
        }
      />

      {/* KPIs filtrados */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <SummaryTile label="Resultados" value={formatNum(sorted.length)} />
        <SummaryTile label="Bruto" value={formatBRL(totals.gross)} tone="silver" />
        <SummaryTile label="Taxas pagas" value={formatBRL(totals.fees)} tone="rose" />
        <SummaryTile label="Líquido recebido" value={formatBRL(totals.net)} tone="gold" />
        <SummaryTile label="Lucro líquido" value={formatBRL(totals.profit)} tone="emerald" />
      </div>

      {/* Filtros */}
      <div className="card p-3 mb-4 flex flex-col gap-2.5">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-500" />
            <input
              className="input pl-9"
              placeholder="Buscar por cliente, produto, dosagem…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="relative sm:w-56">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-500 pointer-events-none z-10" />
            <select
              className="input pl-9"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              {settings.saleStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickFilters.map((qf) => (
            <button
              key={qf.id}
              type="button"
              onClick={() => setQuick(qf.id)}
              className={cn(
                "relative px-3 py-1 rounded-lg text-[11px] font-medium tracking-tight transition",
                quick === qf.id ? "text-gold-100" : "text-silver-400 hover:text-silver-100"
              )}
            >
              {quick === qf.id && (
                <motion.span
                  layoutId="quick-filter"
                  className="absolute inset-0 rounded-lg bg-gold-500/15 ring-1 ring-gold-500/40"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{qf.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List cards — apenas mobile */}
      <div className="md:hidden space-y-2">
        {sorted.length === 0 ? (
          <div className="card p-0">
            <Empty
              icon={ShoppingCart}
              title="Nenhuma venda registrada"
              description={
                query || statusFilter || quick !== "all"
                  ? "Tente limpar os filtros ou ajustar a busca."
                  : "Comece registrando sua primeira venda."
              }
              action={
                !query && !statusFilter && quick === "all" ? (
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setEditing(null);
                      setOpen(true);
                    }}
                  >
                    <Plus size={16} /> Nova venda
                  </button>
                ) : null
              }
            />
          </div>
        ) : (
          sorted.map((s) => {
            const f = getSaleFinancials(s);
            const isSelected = selected.has(s.id);
            const isLoss = f.netProfit < 0;
            return (
              <motion.div
                key={`m-${s.id}`}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "rounded-xl border p-3 transition active:scale-[0.99]",
                  isSelected
                    ? "bg-gold-500/[0.08] border-gold-700/40"
                    : "bg-ink-900/40 border-gold-900/15"
                )}
              >
                <div className="flex items-start gap-2">
                  <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                    <Checkbox checked={isSelected} onChange={() => toggleOne(s.id)} />
                  </div>
                  <button
                    onClick={() => setDetail(s)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] text-silver-400 font-mono tabular-nums">
                        {formatDate(s.date)}
                      </span>
                      <StatusBadge value={s.status} size="xs" />
                    </div>
                    <div className="font-medium text-silver-50 truncate">{s.client}</div>
                    <div className="text-xs text-silver-500 font-mono truncate">
                      {s.contact}
                    </div>
                    <div className="mt-1.5 text-sm text-silver-200 truncate">
                      {s.product} · {s.dosage} · {s.qty} un.
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px]">
                      <span className="inline-flex items-center gap-1 text-silver-300">
                        {s.payment === "Cartão Crédito" ? (
                          <CreditCard size={10} className="text-gold-400" />
                        ) : (
                          <Wallet size={10} className="text-silver-400" />
                        )}
                        {s.payment}
                      </span>
                      {(f.installments ?? 1) > 1 && (
                        <span className="font-mono text-gold-300 bg-gold-500/10 ring-1 ring-gold-500/30 px-1 rounded">
                          {f.installments}×
                        </span>
                      )}
                      {f.signalAmount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-gold-300">
                          <Sparkles size={9} /> sinal {formatBRL(f.signalAmount)}
                        </span>
                      )}
                      {isLoss && (
                        <span className="font-bold text-rose-300 bg-rose-500/10 ring-1 ring-rose-500/30 px-1 rounded">
                          PREJ
                        </span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 pt-2 border-t border-gold-900/15 text-[11px]">
                      <div>
                        <div className="text-silver-500">Bruto</div>
                        <div className="font-mono text-silver-200 tabular-nums">
                          {formatBRL(f.totalSale)}
                        </div>
                      </div>
                      <div>
                        <div className="text-silver-500">Líquido</div>
                        <div className="font-mono text-gold-200 tabular-nums font-semibold">
                          {formatBRL(f.netReceived)}
                        </div>
                      </div>
                      <div>
                        <div className="text-silver-500">Lucro</div>
                        <div
                          className={cn(
                            "font-mono tabular-nums font-semibold",
                            f.netProfit > 0
                              ? "text-emerald-300"
                              : f.netProfit < 0
                              ? "text-rose-300"
                              : "text-silver-400"
                          )}
                        >
                          {formatBRL(f.netProfit)}
                        </div>
                      </div>
                    </div>
                  </button>
                  <div
                    className="flex flex-col gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="p-1.5 rounded-md text-silver-400 hover:bg-gold-500/10 hover:text-gold-300 transition"
                      onClick={() => {
                        setEditing(s);
                        setOpen(true);
                      }}
                      aria-label="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="p-1.5 rounded-md text-silver-400 hover:bg-rose-500/15 hover:text-rose-300 transition"
                      onClick={() => setConfirmDel(s)}
                      aria-label="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Tabela — desktop apenas */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-900/80 backdrop-blur sticky top-0 z-10">
              <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-silver-500">
                <th className="px-3 py-3 w-10">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    aria-label="Selecionar todas"
                  />
                </th>
                <Th field="date" sortBy={sortBy} sortDir={sortDir} onClick={setSort}>Data</Th>
                <Th field="client" sortBy={sortBy} sortDir={sortDir} onClick={setSort}>Cliente</Th>
                <Th field="product" sortBy={sortBy} sortDir={sortDir} onClick={setSort}>Produto</Th>
                <th className="px-4 py-3 font-semibold">Pagamento</th>
                <Th field="gross" sortBy={sortBy} sortDir={sortDir} onClick={setSort} align="right">Bruto</Th>
                <Th field="net" sortBy={sortBy} sortDir={sortDir} onClick={setSort} align="right">Líquido</Th>
                <Th field="profit" sortBy={sortBy} sortDir={sortDir} onClick={setSort} align="right">Lucro</Th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-900/15">
              <AnimatePresence initial={false}>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-0">
                      <Empty
                        icon={ShoppingCart}
                        title="Nenhuma venda registrada"
                        description={
                          query || statusFilter || quick !== "all"
                            ? "Tente limpar os filtros ou ajustar a busca."
                            : "Comece registrando sua primeira venda."
                        }
                        action={
                          !query && !statusFilter && quick === "all" ? (
                            <button
                              className="btn-primary"
                              onClick={() => {
                                setEditing(null);
                                setOpen(true);
                              }}
                            >
                              <Plus size={16} /> Nova venda
                            </button>
                          ) : null
                        }
                      />
                    </td>
                  </tr>
                )}
                {sorted.map((s, i) => {
                  const f = getSaleFinancials(s);
                  const isSelected = selected.has(s.id);
                  const isLoss = f.netProfit < 0;
                  return (
                    <motion.tr
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.22, delay: Math.min(i * 0.015, 0.15) }}
                      className={cn(
                        "transition group cursor-pointer",
                        isSelected ? "bg-gold-500/[0.08]" : "hover:bg-gold-500/[0.04]"
                      )}
                      onClick={() => toggleOne(s.id)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onChange={() => toggleOne(s.id)} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-silver-300 font-mono text-xs tabular-nums">
                        {formatDate(s.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-silver-50">{s.client}</div>
                        <div className="text-xs text-silver-500 font-mono">{s.contact}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-silver-100">{s.product}</div>
                        <div className="text-xs text-silver-500">
                          {s.dosage} · {s.qty} un.
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {s.payment === "Cartão Crédito" ? (
                            <CreditCard size={12} className="text-gold-400" />
                          ) : (
                            <Wallet size={12} className="text-silver-400" />
                          )}
                          <span className="text-silver-200 text-xs">{s.payment}</span>
                          {(f.installments ?? 1) > 1 && (
                            <span className="text-[10px] font-mono text-gold-300 bg-gold-500/10 ring-1 ring-gold-500/30 px-1 rounded">
                              {f.installments}×
                            </span>
                          )}
                          {isLoss && (
                            <span className="text-[10px] font-bold tracking-wider text-rose-300 bg-rose-500/15 ring-1 ring-rose-500/40 px-1 rounded">
                              PREJ
                            </span>
                          )}
                        </div>
                        {f.signalAmount > 0 && (
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-silver-500 font-mono">
                            <Sparkles size={9} className="text-gold-400" />
                            sinal {formatBRL(f.signalAmount)} ({f.signalMethod})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-silver-200 tabular-nums">
                        {formatBRL(f.totalSale)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gold-200 tabular-nums">
                        {formatBRL(f.netReceived)}
                        {f.totalFees > 0 && (
                          <div className="text-[10px] text-rose-400/80 font-normal mt-0.5">
                            − {formatBRL(f.totalFees)} taxas
                          </div>
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-mono font-medium tabular-nums",
                          f.netProfit > 0
                            ? "text-emerald-300"
                            : f.netProfit < 0
                            ? "text-rose-300"
                            : "text-silver-400"
                        )}
                      >
                        {formatBRL(f.netProfit)}
                        <div className="text-[10px] text-silver-500 font-normal">
                          {formatPct(f.netMargin)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge value={s.status} />
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition">
                          <button
                            className="p-1.5 rounded-lg text-silver-400 hover:bg-gold-500/10 hover:text-gold-300 transition"
                            onClick={() => setDetail(s)}
                            aria-label="Ver detalhe"
                            title="Ver comprovante"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="p-1.5 rounded-lg text-silver-400 hover:bg-gold-500/10 hover:text-gold-300 transition"
                            onClick={() => {
                              setEditing(s);
                              setOpen(true);
                            }}
                            aria-label="Editar"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="p-1.5 rounded-lg text-silver-400 hover:bg-rose-500/15 hover:text-rose-300 transition"
                            onClick={() => setConfirmDel(s)}
                            aria-label="Excluir"
                          >
                            <Trash2 size={15} />
                          </button>
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
            className="fixed inset-x-3 bottom-3 sm:left-1/2 sm:-translate-x-1/2 sm:bottom-4 sm:w-auto sm:max-w-[min(64rem,calc(100vw-2rem))] z-40"
          >
            <div className="card-gold bg-ink-900/95 backdrop-blur-xl shadow-glow rounded-2xl overflow-hidden">
              {/* Linha 1: contagem + ações de status + delete */}
              <div className="flex items-center gap-3 flex-wrap px-4 py-3">
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelected(new Set())}
                    className="size-7 rounded-lg bg-gold-500/15 text-gold-300 hover:bg-gold-500/25 grid place-items-center transition"
                    title="Limpar seleção"
                  >
                    <X size={14} />
                  </button>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gold-400 font-semibold">
                      Selecionadas
                    </p>
                    <p className="text-sm font-bold text-silver-50 tabular-nums leading-tight">
                      {selStats.count}
                      <span className="text-silver-500 text-xs font-normal ml-1">
                        · {selStats.units} un.
                      </span>
                    </p>
                  </div>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-1.5 shrink-0">
                  <BulkBtn
                    icon={CheckCircle2}
                    label="Pago"
                    tone="emerald"
                    onClick={() => bulkSetStatus("Pago")}
                    disabled={selStats.paid === selStats.count}
                    title="Marcar como Pago"
                  />
                  <BulkBtn
                    icon={Clock}
                    label="Pendente"
                    tone="gold"
                    onClick={() => bulkSetStatus("Pendente")}
                    title="Marcar como Pendente"
                  />
                  <BulkBtn
                    icon={AlertCircle}
                    label="Parcelado"
                    tone="sky"
                    onClick={() => bulkSetStatus("Parcelado")}
                    title="Marcar como Parcelado"
                  />
                  <BulkBtn
                    icon={XCircle}
                    label="Cancelar"
                    tone="silver"
                    onClick={() => bulkSetStatus("Cancelado")}
                    title="Marcar como Cancelado"
                  />
                  <span className="hidden sm:block w-px h-5 bg-gold-900/40 mx-1" />
                  <button
                    className="btn-secondary text-xs whitespace-nowrap"
                    onClick={() => exportRows(selStats.items, "tirzenix-vendas-selecionadas")}
                  >
                    <Download size={13} /> CSV
                  </button>
                  <button
                    className="btn-danger text-xs whitespace-nowrap"
                    onClick={() => setConfirmBulkDel(true)}
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                </div>
              </div>

              {/* Linha 2: stats grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-2 px-4 py-3 border-t border-gold-900/30 bg-ink-950/40">
                <SumStat label="Bruto" value={formatBRL(selStats.gross)} />
                <SumStat label="Custo" value={formatBRL(selStats.cost)} tone="silver" />
                <SumStat label="Taxas" value={formatBRL(selStats.fees)} tone="rose" />
                <SumStat label="Líquido" value={formatBRL(selStats.net)} tone="gold" />
                <SumStat
                  label="Lucro líq."
                  value={formatBRL(selStats.profit)}
                  tone={selStats.profit >= 0 ? "emerald" : "rose"}
                />
                <SumStat
                  label="Margem"
                  value={formatPct(selStats.margin)}
                  tone={selStats.margin >= 0 ? "gold" : "rose"}
                />
              </div>

              {/* Linha 3 (condicional): indicadores extras */}
              {(selStats.onCard > 0 || selStats.withSignal > 0 || selStats.profit !== 0) && (
                <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-t border-gold-900/30 bg-ink-950/60 text-[11px] text-silver-300">
                  {selStats.onCard > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <CreditCard size={11} className="text-gold-400" />
                      {selStats.onCard} no cartão
                    </span>
                  )}
                  {selStats.withSignal > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Sparkles size={11} className="text-gold-400" />
                      {selStats.withSignal} com sinal
                    </span>
                  )}
                  {selStats.profit < 0 ? (
                    <span className="inline-flex items-center gap-1 text-rose-300">
                      <TrendingDown size={11} />
                      Soma no prejuízo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-300">
                      <TrendingUp size={11} />
                      Soma no lucro
                    </span>
                  )}
                  <span className="text-silver-500 ml-auto whitespace-nowrap">
                    Ticket médio: <strong className="text-silver-100 font-mono">{formatBRL(selStats.ticketAvg)}</strong>
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Detalhe */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detalhes da venda"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDetail(null)}>
              Fechar
            </button>
            {detail && (
              <button
                className="btn-primary"
                onClick={() => {
                  setEditing(detail);
                  setDetail(null);
                  setOpen(true);
                }}
              >
                <Pencil size={14} /> Editar
              </button>
            )}
          </>
        }
      >
        {detail && <SaleDetail sale={detail} />}
      </Modal>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? "Editar venda" : "Nova venda"}
        description="Sinal, taxas e valor líquido calculados em tempo real."
        size="lg"
      >
        <SaleForm
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
        title="Excluir venda"
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
                  deleteSale(confirmDel.id);
                  toast.success("Venda excluída");
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
          Excluir a venda de <strong className="text-gold-300">{confirmDel?.client}</strong> em{" "}
          <strong className="text-gold-300">{formatDate(confirmDel?.date)}</strong>?
        </p>
      </Modal>

      <Modal
        open={confirmBulkDel}
        onClose={() => setConfirmBulkDel(false)}
        title="Excluir selecionadas"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmBulkDel(false)}>
              Cancelar
            </button>
            <button className="btn-danger" onClick={bulkDelete}>
              Excluir {selStats.count}
            </button>
          </>
        }
      >
        <p className="text-sm text-silver-300">
          Excluir <strong className="text-gold-300">{selStats.count}</strong> venda(s) selecionada(s)? Esta ação não pode ser desfeita. Se houver vínculo com estoque, as unidades serão devolvidas.
        </p>
      </Modal>
    </div>
  );
}

// ──────────────────────────────────────
function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "gold" | "emerald" | "silver" | "rose";
}) {
  const t =
    tone === "gold"
      ? "text-gold-300"
      : tone === "emerald"
      ? "text-emerald-300"
      : tone === "silver"
      ? "text-silver-200"
      : tone === "rose"
      ? "text-rose-300"
      : "text-silver-50";
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="card p-4"
    >
      <p className="text-[10px] font-semibold text-gold-400/90 uppercase tracking-[0.12em]">
        {label}
      </p>
      <p className={cn("font-display text-xl font-bold mt-1 tabular-nums font-mono", t)}>{value}</p>
    </motion.div>
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
            sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />
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
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-[0.16em] text-silver-500 font-semibold truncate">
        {label}
      </p>
      <p className={cn("text-sm font-bold tabular-nums font-mono mt-0.5 truncate", t)}>{value}</p>
    </div>
  );
}

function BulkBtn({
  icon: Icon,
  label,
  tone,
  onClick,
  disabled,
  title,
}: {
  icon: React.ComponentType<any>;
  label: string;
  tone: "emerald" | "gold" | "sky" | "silver" | "rose";
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const tones = {
    emerald: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40 hover:bg-emerald-500/25",
    gold: "bg-gold-500/15 text-gold-300 ring-gold-500/40 hover:bg-gold-500/25",
    sky: "bg-sky-500/15 text-sky-300 ring-sky-500/40 hover:bg-sky-500/25",
    silver: "bg-silver-500/15 text-silver-200 ring-silver-500/40 hover:bg-silver-500/25",
    rose: "bg-rose-500/15 text-rose-300 ring-rose-500/40 hover:bg-rose-500/25",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold ring-1 transition disabled:opacity-40 disabled:cursor-not-allowed",
        tones[tone]
      )}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}
