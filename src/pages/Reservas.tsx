import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowRightCircle,
  CalendarClock,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useStore, getReservationTotals } from "@/store/useStore";
import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { ReservationForm } from "@/components/forms/ReservationForm";
import { Empty } from "@/components/ui/Empty";
import { toast } from "@/components/ui/Toast";
import { formatBRL, formatDate, daysUntil, deliveryUrgency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/lib/types";

export default function Reservas() {
  const reservations = useStore((s) => s.reservations);
  const add = useStore((s) => s.addReservation);
  const update = useStore((s) => s.updateReservation);
  const del = useStore((s) => s.deleteReservation);
  const convert = useStore((s) => s.convertReservationToSale);
  const settings = useStore((s) => s.settings);

  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [confirmDel, setConfirmDel] = useState<Reservation | null>(null);
  const [confirmConv, setConfirmConv] = useState<Reservation | null>(null);

  useEffect(() => {
    if (params.get("new") === "1") {
      setEditing(null);
      setOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return reservations
      .filter((r) => {
        if (statusFilter && r.status !== statusFilter) return false;
        if (!ql) return true;
        return (
          r.client.toLowerCase().includes(ql) ||
          r.product.toLowerCase().includes(ql) ||
          (r.productVariant || "").toLowerCase().includes(ql) ||
          r.dosage.toLowerCase().includes(ql)
        );
      })
      .sort((a, b) => (a.deliveryDate || a.date).localeCompare(b.deliveryDate || b.date));
  }, [reservations, q, statusFilter]);

  const totals = useMemo(() => {
    let total = 0,
      balance = 0,
      overdue = 0,
      soon = 0;
    for (const r of filtered) {
      const t = getReservationTotals(r);
      total += t.total;
      balance += t.balance;
      if (r.status === "Entregue" || r.status === "Cancelado") continue;
      const u = deliveryUrgency(r.deliveryDate);
      if (u === "overdue") overdue += 1;
      else if (u === "soon") soon += 1;
    }
    return { total, balance, overdue, soon };
  }, [filtered]);

  return (
    <>
      <PageHeader
        title="Reservas"
        subtitle="Pedidos reservados, a reservar e alertas de entrega"
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={16} /> Nova reserva
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <SummaryCard label="Reservas" value={String(filtered.length)} icon={CalendarClock} />
        <SummaryCard label="Total estimado" value={formatBRL(totals.total)} />
        <SummaryCard label="Saldo a receber" value={formatBRL(totals.balance)} tone="gold" />
        <AlertCard overdue={totals.overdue} soon={totals.soon} />
      </div>

      <div className="card p-3 mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-500" />
          <input
            className="input pl-9"
            placeholder="Buscar cliente, produto…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-56"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos os status</option>
          {settings.reservationStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-900/80 backdrop-blur sticky top-0 z-10">
              <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-silver-500">
                <th className="px-4 py-3 font-semibold">Reserva</th>
                <th className="px-4 py-3 font-semibold">Entrega</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Produto</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold text-right">Sinal</th>
                <th className="px-4 py-3 font-semibold text-right">Saldo</th>
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
                        icon={CalendarClock}
                        title="Nenhuma reserva"
                        description="Registre pedidos com sinal e previsão de entrega para gerenciar seu pipeline."
                        action={
                          <button
                            className="btn-primary"
                            onClick={() => {
                              setEditing(null);
                              setOpen(true);
                            }}
                          >
                            <Plus size={16} /> Nova reserva
                          </button>
                        }
                      />
                    </td>
                  </tr>
                )}
                {filtered.map((r, i) => {
                  const t = getReservationTotals(r);
                  const u = deliveryUrgency(r.deliveryDate);
                  const showAlert = r.status !== "Entregue" && r.status !== "Cancelado";
                  const d = daysUntil(r.deliveryDate);
                  return (
                    <motion.tr
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.2) }}
                      className="hover:bg-gold-500/[0.04] transition group"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-silver-300">{formatDate(r.date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-silver-200">{formatDate(r.deliveryDate)}</span>
                          {showAlert && u === "overdue" && (
                            <motion.span
                              animate={{ opacity: [0.6, 1, 0.6] }}
                              transition={{ duration: 1.6, repeat: Infinity }}
                              className="badge bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40 text-[10px]"
                            >
                              {Math.abs(d || 0)}d atraso
                            </motion.span>
                          )}
                          {showAlert && u === "soon" && (
                            <span className="badge bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/40 text-[10px]">
                              {d === 0 ? "hoje" : `em ${d}d`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-silver-50">{r.client}</div>
                        <div className="text-xs text-silver-500">{r.contact}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-silver-100">{r.product}</div>
                        {r.productVariant && (
                          <div className="text-[11px] text-gold-400 mt-0.5">{r.productVariant}</div>
                        )}
                        <div className="text-xs text-silver-500">{r.dosage} · {r.qty} un.</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-silver-50 tabular-nums">{formatBRL(t.total)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-silver-300 tabular-nums font-mono">
                          {formatBRL(r.signalPaid)}
                        </div>
                        {r.signalPaid > 0 && r.signalMethod && (
                          <div className="text-[10px] text-silver-500">via {r.signalMethod}</div>
                        )}
                      </td>
                      <td className={cn("px-4 py-3 text-right tabular-nums font-medium", t.balance > 0 ? "text-gold-300" : "text-emerald-300")}>
                        {formatBRL(t.balance)}
                      </td>
                      <td className="px-4 py-3"><StatusBadge value={r.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition">
                          {r.status !== "Entregue" && r.status !== "Cancelado" && (
                            <button
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/15 transition"
                              onClick={() => setConfirmConv(r)}
                              title="Converter em venda"
                            >
                              <ArrowRightCircle size={15} />
                            </button>
                          )}
                          <button
                            className="p-1.5 rounded-lg text-silver-400 hover:bg-gold-500/10 hover:text-gold-300 transition"
                            onClick={() => { setEditing(r); setOpen(true); }}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="p-1.5 rounded-lg text-silver-400 hover:bg-rose-500/15 hover:text-rose-300 transition"
                            onClick={() => setConfirmDel(r)}
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

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? "Editar reserva" : "Nova reserva"}
        size="lg"
      >
        <ReservationForm
          initial={editing || undefined}
          onSubmit={(data) => {
            if (editing) { update(editing.id, data); toast.success("Reserva atualizada"); }
            else { add(data); toast.success("Reserva criada"); }
            setOpen(false); setEditing(null);
          }}
          onCancel={() => { setOpen(false); setEditing(null); }}
        />
      </Modal>

      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Excluir reserva"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmDel(null)}>Cancelar</button>
            <button
              className="btn-danger"
              onClick={() => {
                if (confirmDel) { del(confirmDel.id); toast.success("Reserva excluída"); setConfirmDel(null); }
              }}
            >
              Excluir
            </button>
          </>
        }
      >
        <p className="text-sm text-silver-300">
          Excluir a reserva de <strong className="text-gold-300">{confirmDel?.client}</strong>?
        </p>
      </Modal>

      <Modal
        open={!!confirmConv}
        onClose={() => setConfirmConv(null)}
        title="Converter em venda"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmConv(null)}>Cancelar</button>
            <button
              className="btn-primary"
              onClick={() => {
                if (confirmConv) { convert(confirmConv.id); toast.success("Reserva convertida em venda"); setConfirmConv(null); }
              }}
            >
              Converter
            </button>
          </>
        }
      >
        <p className="text-sm text-silver-300">
          A reserva de <strong className="text-gold-300">{confirmConv?.client}</strong> será marcada como{" "}
          <strong className="text-emerald-300">Entregue</strong> e uma nova venda será criada com os dados.
        </p>
      </Modal>
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone?: "gold";
  icon?: React.ComponentType<any>;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="card p-4 flex items-center justify-between"
    >
      <div>
        <p className="text-[10px] font-bold text-gold-400/90 uppercase tracking-[0.14em]">{label}</p>
        <p className={cn("font-display text-xl font-bold mt-1 tabular-nums", tone === "gold" ? "text-gold-300" : "text-silver-50")}>
          {value}
        </p>
      </div>
      {Icon && (
        <span className="size-9 rounded-xl bg-gold-500/15 text-gold-300 grid place-items-center ring-1 ring-gold-700/30">
          <Icon size={18} />
        </span>
      )}
    </motion.div>
  );
}

function AlertCard({ overdue, soon }: { overdue: number; soon: number }) {
  const hasAlert = overdue > 0 || soon > 0;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={cn(
        "card p-4 flex items-center gap-3",
        overdue > 0
          ? "bg-rose-500/10 border-rose-500/30"
          : soon > 0
          ? "bg-gold-500/10 border-gold-500/30"
          : ""
      )}
    >
      <span
        className={cn(
          "size-10 rounded-xl grid place-items-center ring-1",
          overdue > 0
            ? "bg-rose-500/20 text-rose-300 ring-rose-500/40"
            : soon > 0
            ? "bg-gold-500/20 text-gold-300 ring-gold-500/40"
            : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
        )}
      >
        {overdue > 0 ? (
          <AlertTriangle size={18} />
        ) : soon > 0 ? (
          <Clock size={18} />
        ) : (
          <CheckCircle2 size={18} />
        )}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.14em]",
            overdue > 0
              ? "text-rose-300"
              : soon > 0
              ? "text-gold-300"
              : "text-emerald-300"
          )}
        >
          Entregas
        </p>
        {hasAlert ? (
          <p className="text-sm font-bold text-silver-50 mt-0.5">
            {overdue > 0 && <span>{overdue} atrasada(s)</span>}
            {overdue > 0 && soon > 0 && " · "}
            {soon > 0 && <span>{soon} em ≤3 dias</span>}
          </p>
        ) : (
          <p className="text-sm font-bold text-emerald-300 mt-0.5">Tudo em dia</p>
        )}
      </div>
    </motion.div>
  );
}
