import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Users,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Calendar,
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
  profit: number;
  margin: number;
  lastDate: string;
}

export default function Clientes() {
  const clients = useStore((s) => s.clients);
  const sales = useStore((s) => s.sales);
  const addClient = useStore((s) => s.addClient);
  const updateClient = useStore((s) => s.updateClient);
  const deleteClient = useStore((s) => s.deleteClient);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [confirmDel, setConfirmDel] = useState<Client | null>(null);

  // Constrói rows: combina cadastro + vendas
  const rows = useMemo<ClientRow[]>(() => {
    // Mapa por nome lower-case
    const map = new Map<string, ClientRow>();

    // Primeiro, adiciona todos os clientes cadastrados
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
        profit: 0,
        margin: 0,
        lastDate: "",
      });
    }

    // Depois, adiciona stats das vendas
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
        existing.profit += f.netProfit;
        if (s.date > existing.lastDate) existing.lastDate = s.date;
        if (s.contact && !existing.phone) existing.phone = s.contact;
      } else {
        // Cliente fantasma (venda registrada antes do cadastro)
        map.set(key, {
          id: `ghost-${key}`,
          name: s.client,
          phone: s.contact,
          registered: false,
          orders: 1,
          units: s.qty,
          revenue: f.totalSale,
          netRevenue: f.netReceived,
          profit: f.netProfit,
          margin: 0,
          lastDate: s.date,
        });
      }
    }

    // Margens
    const arr = Array.from(map.values()).map((r) => ({
      ...r,
      margin: r.netRevenue ? r.profit / r.netRevenue : 0,
    }));
    return arr.sort((a, b) => b.revenue - a.revenue);
  }, [clients, sales]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(ql) ||
        r.phone.replace(/\D/g, "").includes(ql.replace(/\D/g, ""))
    );
  }, [rows, q]);

  const summary = useMemo(
    () => ({
      total: clients.length,
      ghosts: rows.filter((r) => !r.registered).length,
      revenue: filtered.reduce((a, r) => a + r.revenue, 0),
      profit: filtered.reduce((a, r) => a + r.profit, 0),
    }),
    [clients, rows, filtered]
  );

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

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro com nome + telefone e histórico consolidado por cliente"
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Summary label="Cadastrados" value={formatNum(summary.total)} icon={Users} />
        <Summary label="Sem cadastro" value={formatNum(summary.ghosts)} tone="silver" />
        <Summary label="Receita total" value={formatBRL(summary.revenue)} tone="gold" />
        <Summary label="Lucro líquido" value={formatBRL(summary.profit)} icon={TrendingUp} tone="emerald" />
      </div>

      <div className="card p-3 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-500" />
          <input
            className="input pl-9"
            placeholder="Buscar por nome ou telefone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-900/80 backdrop-blur sticky top-0">
              <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-silver-500">
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Telefone</th>
                <th className="px-4 py-3 font-semibold text-right">Compras</th>
                <th className="px-4 py-3 font-semibold text-right">Receita</th>
                <th className="px-4 py-3 font-semibold text-right">Lucro líq.</th>
                <th className="px-4 py-3 font-semibold text-right">Margem</th>
                <th className="px-4 py-3 font-semibold">Última compra</th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-900/15">
              <AnimatePresence initial={false}>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <Empty
                        icon={Users}
                        title="Nenhum cliente"
                        description={
                          q
                            ? "Tente outro termo de busca."
                            : "Cadastre seu primeiro cliente ou registre uma venda — o cliente é criado automaticamente."
                        }
                        action={
                          !q ? (
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
                {filtered.map((r, i) => {
                  const client = clients.find((c) => c.id === r.id);
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.025, 0.2) }}
                      className="hover:bg-gold-500/[0.04] transition group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "size-9 rounded-full grid place-items-center text-[11px] font-bold ring-1 shadow-glow-sm",
                              r.registered
                                ? "bg-gold-gradient text-ink-950 ring-gold-300/60"
                                : "bg-ink-800 text-silver-400 ring-ink-600"
                            )}
                          >
                            {initials(r.name)}
                          </div>
                          <div>
                            <div className="font-medium text-silver-50 flex items-center gap-1.5">
                              {r.name}
                              {!r.registered && (
                                <span className="text-[9px] uppercase tracking-wider bg-silver-700/30 text-silver-300 px-1.5 py-0.5 rounded">
                                  sem cadastro
                                </span>
                              )}
                            </div>
                            {r.createdAt && (
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
                          >
                            <Phone size={11} className="text-gold-400" />
                            {r.phone}
                          </a>
                        ) : (
                          <span className="text-silver-500 italic text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-silver-200 tabular-nums">
                        {r.orders}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-silver-50 tabular-nums font-mono">
                        {formatBRL(r.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-300 font-medium tabular-nums font-mono">
                        {formatBRL(r.profit)}
                      </td>
                      <td className="px-4 py-3 text-right text-gold-300 font-medium tabular-nums">
                        {r.netRevenue ? formatPct(r.margin) : "—"}
                      </td>
                      <td className="px-4 py-3 text-silver-400">
                        {r.lastDate ? formatDate(r.lastDate) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition">
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
    </>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function Summary({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<any>;
  tone?: "emerald" | "gold" | "silver";
}) {
  const t =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "gold"
      ? "text-gold-300"
      : tone === "silver"
      ? "text-silver-300"
      : "text-silver-50";
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
      </div>
      {Icon && (
        <span
          className={cn(
            "size-9 rounded-xl grid place-items-center ring-1",
            tone === "emerald"
              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
              : "bg-gold-500/15 text-gold-300 ring-gold-700/30"
          )}
        >
          <Icon size={18} />
        </span>
      )}
    </motion.div>
  );
}
