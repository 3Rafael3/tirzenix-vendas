import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  CircleDollarSign,
  Percent,
  Hourglass,
  Package,
  Users,
  CheckCircle2,
  Target,
  Sparkles,
  ArrowUpRight,
  Boxes,
  Wallet,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useStore,
  getSaleTotals,
  getSaleFinancials,
  getReservationTotals,
  getProductMetrics,
} from "@/store/useStore";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Sparkles as SparklesFx } from "@/components/effects/Sparkles";
import { GoldConfetti } from "@/components/effects/GoldConfetti";
import {
  formatBRL,
  formatNum,
  formatPct,
  monthKey,
  monthLabel,
  todayISO,
} from "@/lib/utils";
import { cn } from "@/lib/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

export default function Dashboard() {
  const sales = useStore((s) => s.sales);
  const reservations = useStore((s) => s.reservations);
  const products = useStore((s) => s.products);
  const goal = useStore((s) => s.settings.monthlyGoal);
  const brand = useStore((s) => s.settings.brand);

  const stats = useMemo(() => {
    let revenue = 0,
      profit = 0,
      cost = 0,
      netRevenue = 0,
      netProfit = 0,
      totalFees = 0,
      units = 0,
      receivable = 0,
      paidCount = 0;
    const clients = new Set<string>();
    for (const s of sales) {
      const f = getSaleFinancials(s);
      revenue += f.totalSale;
      profit += f.grossProfit;
      cost += f.totalPurchase;
      netRevenue += f.netReceived;
      netProfit += f.netProfit;
      totalFees += f.totalFees;
      units += s.qty;
      if (s.client) clients.add(s.client);
      if (s.status === "Pendente" || s.status === "Parcelado")
        receivable += f.totalSale;
      if (s.status === "Pago") paidCount += 1;
    }
    const margin = revenue ? profit / revenue : 0;
    const netMargin = netRevenue ? netProfit / netRevenue : 0;
    const avgTicket = sales.length ? revenue / sales.length : 0;
    // Vendas com prejuízo (lucro líquido < 0)
    const lossSales = sales.filter((s) => getSaleFinancials(s).netProfit < 0).length;
    // Vendas no mês
    const monthSales = sales.filter((s) => monthKey(s.date) === monthKey(todayISO())).length;

    const thisMonth = monthKey(todayISO());
    const monthRevenue = sales
      .filter((s) => monthKey(s.date) === thisMonth)
      .reduce((acc, s) => acc + getSaleTotals(s).totalSale, 0);

    let resTotal = 0,
      resBalance = 0,
      toReserve = 0,
      reserved = 0;
    for (const r of reservations) {
      const { total, balance } = getReservationTotals(r);
      if (r.status === "Reservado" || r.status === "A Reservar") {
        resTotal += total;
        resBalance += balance;
      }
      if (r.status === "A Reservar") toReserve += 1;
      if (r.status === "Reservado") reserved += 1;
    }

    // Estoque
    let stockValue = 0,
      potentialRevenue = 0,
      potentialProfit = 0,
      stockUnits = 0,
      lowStock = 0;
    for (const p of products) {
      const m = getProductMetrics(p);
      stockValue += m.stockValue;
      potentialRevenue += m.potentialRevenue;
      potentialProfit += m.potentialProfit;
      stockUnits += p.stockQty;
      if (m.lowStock || m.outOfStock) lowStock += 1;
    }

    return {
      revenue,
      profit,
      cost,
      netRevenue,
      netProfit,
      totalFees,
      margin,
      netMargin,
      lossSales,
      monthSales,
      receivable,
      monthRevenue,
      salesCount: sales.length,
      units,
      avgTicket,
      uniqueClients: clients.size,
      paidCount,
      resTotal,
      resBalance,
      toReserve,
      reserved,
      stockValue,
      potentialRevenue,
      potentialProfit,
      stockUnits,
      lowStock,
      productCount: products.length,
    };
  }, [sales, reservations, products]);

  const series = useMemo(() => {
    const now = new Date();
    const arr: { key: string; label: string; receita: number; lucro: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      arr.push({ key, label: monthLabel(key), receita: 0, lucro: 0 });
    }
    for (const s of sales) {
      const k = monthKey(s.date);
      const slot = arr.find((x) => x.key === k);
      if (slot) {
        const { totalSale, profit } = getSaleTotals(s);
        slot.receita += totalSale;
        slot.lucro += profit;
      }
    }
    return arr;
  }, [sales]);

  const topClients = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number }>();
    for (const s of sales) {
      if (!s.client) continue;
      const cur = map.get(s.client) || { revenue: 0, orders: 0 };
      cur.revenue += getSaleTotals(s).totalSale;
      cur.orders += 1;
      map.set(s.client, cur);
    }
    return Array.from(map.entries())
      .map(([client, v]) => ({ client, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [sales]);

  const goalProgress = Math.min(stats.monthRevenue / (goal || 1), 1);
  const goalRemaining = Math.max(goal - stats.monthRevenue, 0);
  const goalAchieved = goalProgress >= 1;

  // Dispara confete dourado quando a meta é atingida (uma vez por sessão)
  const [confettiFired, setConfettiFired] = useState(false);
  useEffect(() => {
    if (goalAchieved && !confettiFired) {
      const t = setTimeout(() => setConfettiFired(true), 400);
      return () => clearTimeout(t);
    }
  }, [goalAchieved, confettiFired]);

  const empty = sales.length === 0 && products.length === 0;

  return (
    <>
      <GoldConfetti trigger={confettiFired} />
      <PageHeader
        title="Dashboard"
        subtitle={`${brand.name} · ${brand.tagline}`}
        actions={
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ink-900/60 backdrop-blur border border-gold-900/30 text-xs text-silver-300">
            <motion.span
              className="size-2 rounded-full bg-emerald-400"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            Tempo real
          </div>
        }
      />

      {empty && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 mb-5 border-gold-700/40 bg-gradient-to-r from-gold-950/40 to-ink-900/60"
        >
          <div className="flex items-start gap-4">
            <span className="size-11 rounded-xl bg-gold-500/15 text-gold-300 grid place-items-center shrink-0 ring-1 ring-gold-700/40">
              <Sparkles size={20} />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg font-semibold text-silver-50">
                Sistema pronto para uso
              </h3>
              <p className="text-sm text-silver-400 mt-1">
                Comece cadastrando seus produtos no <strong className="text-gold-300">Estoque</strong> para controlar custos automaticamente, depois registre vendas e reservas.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/estoque" className="btn-primary">
                  <Boxes size={16} /> Cadastrar produto
                </Link>
                <Link to="/vendas" className="btn-secondary">
                  Lançar venda
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* KPIs principais */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4"
      >
        <Kpi icon={DollarSign} tone="silver" label="Receita bruta" value={stats.revenue} formatter={formatBRL} sub={`${formatBRL(stats.monthRevenue)} no mês`} />
        <Kpi icon={DollarSign} tone="gold" label="Receita líquida" value={stats.netRevenue} formatter={formatBRL} sub={stats.totalFees > 0 ? `−${formatBRL(stats.totalFees)} taxas` : "sem taxas"} />
        <Kpi icon={TrendingUp} tone="emerald" label="Lucro líquido" value={stats.netProfit} formatter={formatBRL} sub={`Bruto ${formatBRL(stats.profit)}`} />
        <Kpi icon={CircleDollarSign} tone="ink" label="Custo total" value={stats.cost} formatter={formatBRL} sub={`Ticket ${formatBRL(stats.avgTicket)}`} />
        <Kpi icon={Hourglass} tone="amber" label="A receber" value={stats.receivable} formatter={formatBRL} sub="Pendente + Parcelado" />
      </motion.div>

      {/* Saúde financeira — destaque da margem */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45 }}
        className="card p-6 mt-4 relative overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 size-56 rounded-full bg-gold-700/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-8 size-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative grid grid-cols-1 lg:grid-cols-4 gap-5 items-center">
          {/* Bloco principal: margem líquida grande */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 text-gold-300">
              <Percent size={16} />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]">
                Margem líquida geral
              </p>
            </div>
            <p
              className={`font-display text-4xl lg:text-5xl font-bold mt-2 tabular-nums tracking-tight-display ${
                stats.netMargin < 0
                  ? "text-rose-300"
                  : stats.netMargin >= 0.15
                  ? "text-emerald-300"
                  : "text-gold-300"
              }`}
            >
              <AnimatedNumber
                value={stats.netMargin * 100}
                format={(v) => `${v.toFixed(1)}%`}
              />
            </p>
            <p className="text-xs text-silver-400 mt-1">
              {stats.netRevenue > 0
                ? `${formatBRL(stats.netProfit)} sobre ${formatBRL(stats.netRevenue)} líquido`
                : "sem vendas ainda"}
            </p>
          </div>

          {/* Sub-stats */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <HealthStat
              label="Margem bruta"
              value={formatPct(stats.margin)}
              icon={TrendingUp}
              tone={stats.margin >= 0 ? "emerald" : "rose"}
            />
            <HealthStat
              label="Vendas no mês"
              value={formatNum(stats.monthSales)}
              icon={CheckCircle2}
              sub={`de ${formatNum(stats.salesCount)} total`}
            />
            <HealthStat
              label="Vendas no prejuízo"
              value={formatNum(stats.lossSales)}
              icon={AlertTriangle}
              tone={stats.lossSales > 0 ? "rose" : "emerald"}
              sub={stats.lossSales > 0 ? "revisar" : "tudo ok"}
              pulse={stats.lossSales > 0}
            />
            <HealthStat
              label="Taxas pagas"
              value={formatBRL(stats.totalFees)}
              icon={CircleDollarSign}
              tone={stats.totalFees > 0 ? "amber" : "silver"}
            />
          </div>
        </div>
      </motion.div>

      {/* Linha 2: Chart + Meta */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4"
      >
        <motion.div variants={item} className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-gold-400/90 uppercase tracking-[0.16em]">
                Receita & Lucro · últimos 6 meses
              </p>
              <h3 className="font-display text-xl font-semibold text-silver-50 mt-0.5">
                Evolução mensal
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <Legend dot="bg-gold-500" label="Receita" />
              <Legend dot="bg-silver-300" label="Lucro" />
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="d-rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4a574" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#d4a574" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="d-prof" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#cbd0db" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#cbd0db" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#23232e" vertical={false} />
                <XAxis dataKey="label" stroke="#7d8394" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#7d8394" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                <Tooltip
                  cursor={{ stroke: "#d4a574", strokeWidth: 1, strokeDasharray: "3 3", opacity: 0.4 }}
                  content={<PremiumChartTooltip />}
                />
                <Area type="monotone" dataKey="receita" stroke="#d4a574" strokeWidth={2.5} fill="url(#d-rev)" name="Receita" animationDuration={900} />
                <Area type="monotone" dataKey="lucro" stroke="#cbd0db" strokeWidth={2.2} fill="url(#d-prof)" name="Lucro" animationDuration={1100} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Meta mensal */}
        <motion.div variants={item} className="card lift p-6 flex flex-col relative overflow-hidden">
          <div className="absolute -top-12 -right-12 size-40 rounded-full bg-gold-700/20 blur-2xl" />
          <SparklesFx count={goalAchieved ? 14 : 6} />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gold-300">
                <Target size={18} />
                <p className="text-[10px] font-bold uppercase tracking-[0.16em]">
                  Meta do mês
                </p>
              </div>
              {goalAchieved && (
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full ring-1 ring-emerald-500/40"
                >
                  <Sparkles size={10} /> Atingida
                </motion.span>
              )}
            </div>
            <p className="font-display text-3xl font-bold text-silver-50 mt-3 tabular-nums">
              <AnimatedNumber value={stats.monthRevenue} format={formatBRL} />
            </p>
            <p className="text-sm text-silver-400">
              de <span className="font-semibold text-gold-300">{formatBRL(goal)}</span>
            </p>

            <div className="mt-5">
              <div className="h-3 bg-ink-900 rounded-full overflow-hidden relative ring-1 ring-gold-900/30">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${goalProgress * 100}%` }}
                  transition={{ duration: 1.1, ease: EASE_OUT }}
                  className={cn(
                    "h-full rounded-full",
                    goalAchieved ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gold-gradient"
                  )}
                />
                <motion.div
                  className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <div className="flex justify-between text-xs text-silver-400 mt-2">
                <span>{formatPct(goalProgress)} atingido</span>
                <span>Faltam {formatBRL(goalRemaining)}</span>
              </div>
            </div>

            <div className="mt-auto pt-6 grid grid-cols-2 gap-3">
              <MiniStat label="Clientes únicos" value={formatNum(stats.uniqueClients)} icon={Users} />
              <MiniStat label="Vendas pagas" value={formatNum(stats.paidCount)} icon={CheckCircle2} />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Linha 3: Estoque + Reservas */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4"
      >
        <motion.div variants={item} className="card p-6 relative overflow-hidden">
          <div className="absolute -bottom-12 -left-12 size-40 rounded-full bg-gold-700/15 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gold-300">
                <Wallet size={18} />
                <p className="text-[10px] font-bold uppercase tracking-[0.16em]">
                  Central de Custo
                </p>
              </div>
              <Link to="/estoque" className="text-[11px] text-silver-400 hover:text-gold-300 inline-flex items-center gap-0.5">
                ver tudo <ArrowUpRight size={11} />
              </Link>
            </div>
            <p className="font-display text-3xl font-bold text-silver-50 mt-3 tabular-nums">
              <AnimatedNumber value={stats.stockValue} format={formatBRL} />
            </p>
            <p className="text-sm text-silver-400">em estoque imobilizado</p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <MiniStat label="Receita potencial" value={formatBRL(stats.potentialRevenue)} icon={TrendingUp} />
              <MiniStat label="Lucro potencial" value={formatBRL(stats.potentialProfit)} icon={DollarSign} />
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-950/60 border border-gold-900/30 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Boxes size={14} className="text-silver-400" />
                <span className="text-xs text-silver-300">
                  <strong className="text-silver-50">{stats.productCount}</strong> SKUs · {formatNum(stats.stockUnits)} un.
                </span>
              </div>
              {stats.lowStock > 0 && (
                <motion.span
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="badge bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40 text-[10px]"
                >
                  <AlertTriangle size={10} /> {stats.lowStock}
                </motion.span>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-semibold text-silver-50">Top 5 clientes</h3>
            <span className="text-[10px] text-silver-500 uppercase tracking-wider">Por receita</span>
          </div>
          {topClients.length === 0 ? (
            <p className="text-sm text-silver-400 py-6 text-center">Sem vendas registradas ainda.</p>
          ) : (
            <ul className="divide-y divide-gold-900/15">
              {topClients.map((c, i) => (
                <motion.li
                  key={c.client}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div
                    className={cn(
                      "size-9 rounded-full grid place-items-center text-xs font-bold ring-1",
                      i === 0
                        ? "bg-gold-gradient text-ink-950 ring-gold-300/60 shadow-glow-sm"
                        : i === 1
                        ? "bg-silver-200 text-ink-900 ring-silver-300/40"
                        : i === 2
                        ? "bg-gold-700/40 text-gold-200 ring-gold-700/40"
                        : "bg-ink-800 text-silver-300 ring-ink-600"
                    )}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-silver-50 truncate">{c.client}</p>
                    <p className="text-xs text-silver-500">{c.orders} compra(s)</p>
                  </div>
                  <p className="text-sm font-semibold text-gold-200 tabular-nums">
                    {formatBRL(c.revenue)}
                  </p>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>
      </motion.div>

      {/* Linha 4: Reservas resumo */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6 mt-4 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 size-48 rounded-full bg-gold-700/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-gold-300">
              <Package size={18} />
              <p className="text-[10px] font-bold uppercase tracking-[0.16em]">Pipeline de reservas</p>
            </div>
            <p className="font-display text-2xl font-bold text-silver-50 mt-1 tabular-nums">
              <AnimatedNumber value={stats.resTotal} format={formatBRL} />
            </p>
            <p className="text-sm text-silver-400">Potencial em carteira</p>
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3 flex-1 md:max-w-md">
            <MiniStat label="A reservar" value={formatNum(stats.toReserve)} icon={Hourglass} />
            <MiniStat label="Reservados" value={formatNum(stats.reserved)} icon={CheckCircle2} />
            <MiniStat label="Saldo" value={formatBRL(stats.resBalance)} icon={Wallet} />
          </div>
          <Link to="/reservas" className="btn-secondary self-start">
            Ver pipeline <ArrowUpRight size={14} />
          </Link>
        </div>
      </motion.div>
    </>
  );
}

// ─── helpers ────────────────────────────────────────
const toneMap: Record<string, { bg: string; text: string; bar: string }> = {
  gold: {
    bg: "bg-gold-500/15",
    text: "text-gold-300",
    bar: "from-gold-500/40 to-gold-800/10",
  },
  emerald: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    bar: "from-emerald-500/40 to-emerald-800/10",
  },
  silver: {
    bg: "bg-silver-500/15",
    text: "text-silver-200",
    bar: "from-silver-500/40 to-silver-800/10",
  },
  amber: {
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    bar: "from-amber-500/40 to-amber-800/10",
  },
  ink: { bg: "bg-ink-700", text: "text-silver-200", bar: "from-ink-700 to-ink-800" },
};

function Kpi({
  icon: Icon,
  label,
  value,
  formatter,
  sub,
  tone = "gold",
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: number;
  formatter: (v: number) => string;
  sub?: string;
  tone?: keyof typeof toneMap;
}) {
  const t = toneMap[tone];
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="card p-4 lg:p-5 relative overflow-hidden"
    >
      <div className={cn("absolute -top-12 -right-12 size-32 rounded-full blur-2xl bg-gradient-to-br opacity-60", t.bar)} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-gold-400/90 uppercase tracking-[0.14em]">{label}</p>
          <span className={cn("size-8 rounded-lg grid place-items-center", t.bg, t.text)}>
            <Icon size={15} />
          </span>
        </div>
        <p className="font-display text-xl lg:text-2xl font-bold text-silver-50 mt-3 tabular-nums">
          <AnimatedNumber value={value} format={formatter} />
        </p>
        {sub && <p className="text-xs text-silver-500 mt-1 truncate">{sub}</p>}
      </div>
    </motion.div>
  );
}

/** Tooltip premium para o gráfico de receita/lucro */
function PremiumChartTooltip(props: any) {
  const { active, payload, label } = props;
  if (!active || !payload || !payload.length) return null;
  const receita = payload.find((p: any) => p.dataKey === "receita")?.value || 0;
  const lucro = payload.find((p: any) => p.dataKey === "lucro")?.value || 0;
  const margin = receita ? lucro / receita : 0;
  return (
    <div className="relative">
      <div className="absolute -inset-1 bg-gold-500/20 blur-xl rounded-2xl pointer-events-none" />
      <div className="relative rounded-xl bg-ink-900/95 backdrop-blur-xl ring-1 ring-gold-700/40 shadow-glow px-3 py-2.5 min-w-[180px]">
        <div className="absolute top-0 inset-x-0 h-px bg-gold-gradient" />
        <p className="text-[10px] uppercase tracking-[0.18em] text-gold-400 font-semibold">
          {label}
        </p>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-silver-300">
              <span className="size-2 rounded-full bg-gold-500" />
              Receita
            </span>
            <span className="font-mono tabular-nums text-sm font-semibold text-silver-50">
              {formatBRL(receita)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-silver-300">
              <span className="size-2 rounded-full bg-silver-300" />
              Lucro
            </span>
            <span className="font-mono tabular-nums text-sm font-semibold text-emerald-300">
              {formatBRL(lucro)}
            </span>
          </div>
        </div>
        {receita > 0 && (
          <div className="mt-2 pt-2 border-t border-gold-900/40 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-silver-500">Margem</span>
            <span className="font-mono tabular-nums text-xs font-bold text-gold-300">
              {formatPct(margin)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function HealthStat({
  label,
  value,
  icon: Icon,
  tone = "silver",
  sub,
  pulse,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "emerald" | "rose" | "amber" | "silver" | "gold";
  sub?: string;
  pulse?: boolean;
}) {
  const t =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "rose"
      ? "text-rose-300"
      : tone === "amber"
      ? "text-amber-300"
      : tone === "gold"
      ? "text-gold-300"
      : "text-silver-100";
  const iconBg =
    tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
      : tone === "rose"
      ? "bg-rose-500/15 text-rose-300 ring-rose-500/40"
      : tone === "amber"
      ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
      : "bg-gold-500/15 text-gold-300 ring-gold-700/30";
  return (
    <motion.div
      animate={pulse ? { boxShadow: ["0 0 0 0 rgba(244,63,94,0)", "0 0 16px 2px rgba(244,63,94,0.18)", "0 0 0 0 rgba(244,63,94,0)"] } : {}}
      transition={pulse ? { duration: 2, repeat: Infinity } : {}}
      className="rounded-xl border border-gold-900/25 bg-ink-950/50 p-3.5 flex items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[0.16em] text-silver-500 font-semibold">
          {label}
        </p>
        <p className={cn("text-lg font-bold mt-0.5 tabular-nums font-mono truncate", t)}>
          {value}
        </p>
        {sub && <p className="text-[10px] text-silver-500 mt-0.5 truncate">{sub}</p>}
      </div>
      <span className={cn("size-8 rounded-lg grid place-items-center ring-1 shrink-0", iconBg)}>
        <Icon size={14} />
      </span>
    </motion.div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<any> }) {
  return (
    <div className="rounded-xl border border-gold-900/20 p-3 bg-ink-950/40">
      <div className="flex items-center gap-2 text-silver-400">
        <Icon size={13} className="text-gold-400" />
        <span className="text-[9px] font-bold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="text-base lg:text-lg font-bold text-silver-50 mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-silver-400">
      <span className={cn("size-2 rounded-full", dot)} />
      {label}
    </span>
  );
}
