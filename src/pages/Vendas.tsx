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
} from "lucide-react";
import { useStore, getSaleFinancials } from "@/store/useStore";
import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { SaleForm } from "@/components/forms/SaleForm";
import { SaleDetail } from "@/components/sales/SaleDetail";
import { toast } from "@/components/ui/Toast";
import { Empty } from "@/components/ui/Empty";
import { formatBRL, formatDate, formatNum, monthKey, todayISO } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Sale } from "@/lib/types";

type QuickFilter = "all" | "thisMonth" | "paid" | "pending" | "card" | "withSignal";

const quickFilters: { id: QuickFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "thisMonth", label: "Este mês" },
  { id: "paid", label: "Pagas" },
  { id: "pending", label: "Pendentes" },
  { id: "card", label: "No cartão" },
  { id: "withSignal", label: "Com sinal" },
];

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
  const [detail, setDetail] = useState<Sale | null>(null);

  useEffect(() => {
    if (params.get("new") === "1") {
      setEditing(null);
      setOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const thisMonth = monthKey(todayISO());
    return sales
      .filter((s) => {
        if (statusFilter && s.status !== statusFilter) return false;
        if (quick === "thisMonth" && monthKey(s.date) !== thisMonth) return false;
        if (quick === "paid" && s.status !== "Pago") return false;
        if (quick === "pending" && s.status !== "Pendente" && s.status !== "Parcelado") return false;
        if (quick === "card" && s.payment !== "Cartão Crédito") return false;
        if (quick === "withSignal" && !s.signal?.amount) return false;
        if (!q) return true;
        return (
          s.client.toLowerCase().includes(q) ||
          s.product.toLowerCase().includes(q) ||
          (s.productVariant || "").toLowerCase().includes(q) ||
          s.contact.toLowerCase().includes(q) ||
          s.dosage.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [sales, query, statusFilter, quick]);

  const totals = useMemo(() => {
    let gross = 0,
      net = 0,
      profit = 0,
      fees = 0,
      units = 0;
    for (const s of filtered) {
      const f = getSaleFinancials(s);
      gross += f.totalSale;
      net += f.netReceived;
      profit += f.netProfit;
      fees += f.totalFees;
      units += s.qty;
    }
    return { gross, net, profit, fees, units };
  }, [filtered]);

  function handleSave(data: Omit<Sale, "id">) {
    if (editing) {
      updateSale(editing.id, data);
      toast.success("Venda atualizada");
    } else {
      addSale(data);
      toast.success("Venda registrada");
    }
    setOpen(false);
    setEditing(null);
  }

  function handleExport() {
    const headers = [
      "Data", "Produto", "Dosagem", "Cliente", "Contato", "Qtd",
      "Subitem", "Ampolas/Seringas Estoque", "Caixas Fechadas", "Preço Compra", "Preço Venda", "Total Bruto",
      "Sinal", "Método Sinal", "Pagamento", "Parcelas",
      "Taxa Cartão", "Taxa Parcelamento", "Outras Taxas", "Total Taxas",
      "Valor Líquido", "Custo", "Lucro Líquido", "Margem Líquida",
      "Status", "Mês", "Observações",
    ];
    const rows = filtered.map((s) => {
      const f = getSaleFinancials(s);
      return [
        s.date, s.product, s.dosage, s.client, s.contact, s.qty,
        s.productVariant || "",
        s.productVariantUnits ? s.qty * s.productVariantUnits : "",
        (s.productVariantUnits || 1) >= 4 ? s.qty : 0,
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
    a.download = `tirzenix-vendas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  return (
    <>
      <PageHeader
        title="Vendas"
        subtitle="Registro completo com sinal, parcelamento, taxas e valor líquido"
        actions={
          <>
            <button className="btn-secondary" onClick={handleExport} disabled={filtered.length === 0}>
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
        <SummaryTile label="Resultados" value={formatNum(filtered.length)} />
        <SummaryTile label="Bruto" value={formatBRL(totals.gross)} tone="silver" />
        <SummaryTile label="Taxas pagas" value={formatBRL(totals.fees)} tone="rose" />
        <SummaryTile label="Líquido recebido" value={formatBRL(totals.net)} tone="gold" />
        <SummaryTile label="Lucro líquido" value={formatBRL(totals.profit)} tone="emerald" />
      </div>

      {/* Filtros rápidos */}
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
                quick === qf.id
                  ? "text-gold-100"
                  : "text-silver-400 hover:text-silver-100"
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

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-900/80 backdrop-blur sticky top-0 z-10">
              <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-silver-500">
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Produto</th>
                <th className="px-4 py-3 font-semibold">Pagamento</th>
                <th className="px-4 py-3 font-semibold text-right">Bruto</th>
                <th className="px-4 py-3 font-semibold text-right">Líquido</th>
                <th className="px-4 py-3 font-semibold text-right">Lucro</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-900/15">
              <AnimatePresence initial={false}>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-0">
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
                {filtered.map((s, i) => {
                  const f = getSaleFinancials(s);
                  return (
                    <motion.tr
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.2) }}
                      className="hover:bg-gold-500/[0.04] transition group cursor-pointer"
                      onClick={() => setDetail(s)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-silver-300">
                        {formatDate(s.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-silver-50">{s.client}</div>
                        <div className="text-xs text-silver-500">{s.contact}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-silver-100">{s.product}</div>
                        {s.productVariant && (
                          <div className="text-[11px] text-gold-400 mt-0.5">{s.productVariant}</div>
                        )}
                        <div className="text-xs text-silver-500">
                          {s.dosage} · {s.qty} un.
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
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
                        </div>
                        {f.signalAmount > 0 && (
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-silver-500">
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
                      <td className="px-4 py-3 text-right font-mono font-medium text-emerald-300 tabular-nums">
                        {formatBRL(f.netProfit)}
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

      {/* Modal Form */}
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

      {/* Modal Confirm Delete */}
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
          <strong className="text-gold-300">{formatDate(confirmDel?.date)}</strong>? Se a venda tinha vínculo com estoque, as unidades serão devolvidas.
        </p>
      </Modal>
    </>
  );
}

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
