import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  Plus,
  PackagePlus,
  PackageMinus,
  Scale,
  Boxes,
  Wallet,
  TrendingUp,
  Percent,
  AlertTriangle,
  Pencil,
  Trash2,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  RotateCcw,
} from "lucide-react";
import { useStore, getProductMetrics } from "@/store/useStore";
import { packageUnitsFor, stockUnitPlural, stockUnitSingular } from "@/lib/productVariants";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Modal } from "@/components/ui/Modal";
import { Empty } from "@/components/ui/Empty";
import { ProductForm } from "@/components/forms/ProductForm";
import { MovementForm } from "@/components/forms/MovementForm";
import { toast } from "@/components/ui/Toast";
import { formatBRL, formatDate, formatNum, formatPct } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

type Tab = "products" | "movements";

export default function Estoque() {
  const products = useStore((s) => s.products);
  const movements = useStore((s) => s.movements);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);

  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("products");
  const [q, setQ] = useState("");
  const [productModal, setProductModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [movementModal, setMovementModal] = useState<
    null | "entry" | "exit" | "adjustment"
  >(null);
  const [confirmDel, setConfirmDel] = useState<Product | null>(null);

  useEffect(() => {
    if (params.get("new") === "1") {
      setTab("products");
      setEditing(null);
      setProductModal(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  // KPIs
  const kpis = useMemo(() => {
    let stockValue = 0,
      potentialRevenue = 0,
      potentialProfit = 0,
      lowCount = 0,
      outCount = 0,
      totalUnits = 0;
    const marginsSum: number[] = [];
    for (const p of products) {
      const m = getProductMetrics(p);
      stockValue += m.stockValue;
      potentialRevenue += m.potentialRevenue;
      potentialProfit += m.potentialProfit;
      totalUnits += p.stockQty;
      if (m.outOfStock) outCount += 1;
      else if (m.lowStock) lowCount += 1;
      if (p.salePrice > 0) marginsSum.push(m.margin);
    }
    const avgMargin =
      marginsSum.length > 0
        ? marginsSum.reduce((a, b) => a + b, 0) / marginsSum.length
        : 0;
    return {
      stockValue,
      potentialRevenue,
      potentialProfit,
      avgMargin,
      lowCount,
      outCount,
      totalUnits,
      skuCount: products.length,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(ql) ||
        p.dosage.toLowerCase().includes(ql) ||
        (p.sku || "").toLowerCase().includes(ql) ||
        (p.supplier || "").toLowerCase().includes(ql)
    );
  }, [products, q]);

  const recentMovements = useMemo(() => {
    return movements
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 200);
  }, [movements]);

  function nameFor(productId: string) {
    const p = products.find((x) => x.id === productId);
    return p ? `${p.name} · ${p.dosage}` : "Produto removido";
  }

  return (
    <>
      <PageHeader
        title="Central de Custo & Estoque"
        subtitle="Catálogo de produtos, custos, margens e movimentações"
        actions={
          <>
            <button
              className="btn-secondary"
              onClick={() => setMovementModal("exit")}
            >
              <PackageMinus size={16} /> Saída
            </button>
            <button
              className="btn-secondary"
              onClick={() => setMovementModal("adjustment")}
            >
              <Scale size={16} /> Ajuste
            </button>
            <button
              className="btn-secondary"
              onClick={() => setMovementModal("entry")}
            >
              <PackagePlus size={16} /> Entrada
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setEditing(null);
                setProductModal(true);
              }}
            >
              <Plus size={16} /> Novo produto
            </button>
          </>
        }
      />

      {/* KPIs */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4"
      >
        <Kpi
          icon={Wallet}
          tone="gold"
          label="Valor em estoque"
          value={kpis.stockValue}
          formatter={formatBRL}
          sub="Custo total imobilizado"
        />
        <Kpi
          icon={TrendingUp}
          tone="emerald"
          label="Receita potencial"
          value={kpis.potentialRevenue}
          formatter={formatBRL}
          sub="Se vender tudo a preço de venda"
        />
        <Kpi
          icon={TrendingUp}
          tone="silver"
          label="Lucro potencial"
          value={kpis.potentialProfit}
          formatter={formatBRL}
          sub={`Margem média ${formatPct(kpis.avgMargin)}`}
        />
        <Kpi
          icon={Boxes}
          tone="ink"
          label="SKUs cadastrados"
          value={kpis.skuCount}
          formatter={(v) => formatNum(Math.round(v))}
          sub={`${formatNum(kpis.totalUnits)} unidades`}
        />
        <Kpi
          icon={AlertTriangle}
          tone={kpis.outCount > 0 ? "rose" : kpis.lowCount > 0 ? "amber" : "emerald"}
          label="Alertas"
          value={kpis.lowCount + kpis.outCount}
          formatter={(v) => formatNum(Math.round(v))}
          sub={
            kpis.outCount > 0
              ? `${kpis.outCount} esgotado(s) · ${kpis.lowCount} baixo(s)`
              : kpis.lowCount > 0
              ? `${kpis.lowCount} em alerta`
              : "Tudo em ordem"
          }
        />
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center justify-between mt-6 mb-3">
        <div className="inline-flex rounded-xl bg-ink-900/60 border border-gold-900/25 p-1">
          <TabBtn active={tab === "products"} onClick={() => setTab("products")}>
            <Boxes size={14} /> Produtos
          </TabBtn>
          <TabBtn active={tab === "movements"} onClick={() => setTab("movements")}>
            <RotateCcw size={14} /> Movimentações
          </TabBtn>
        </div>
        <div className="relative w-full max-w-xs hidden sm:block">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-500"
          />
          <input
            className="input pl-9"
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === "products" ? (
          <motion.div
            key="prod"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="card overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-900/80 backdrop-blur sticky top-0 z-10">
                  <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-silver-500">
                    <th className="px-4 py-3 font-semibold">Produto</th>
                    <th className="px-4 py-3 font-semibold text-right">Estoque</th>
                    <th className="px-4 py-3 font-semibold text-right">Compra caixa</th>
                    <th className="px-4 py-3 font-semibold text-right">Venda caixa</th>
                    <th className="px-4 py-3 font-semibold text-right">Lucro/unid.</th>
                    <th className="px-4 py-3 font-semibold text-right">Margem</th>
                    <th className="px-4 py-3 font-semibold text-right">Valor estoque</th>
                    <th className="px-4 py-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-900/15">
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <Empty
                          icon={Boxes}
                          title="Nenhum produto cadastrado"
                          description="Cadastre seu primeiro produto para começar a controlar custos, preços e estoque."
                          action={
                            <button
                              className="btn-primary"
                              onClick={() => {
                                setEditing(null);
                                setProductModal(true);
                              }}
                            >
                              <Plus size={16} /> Cadastrar produto
                            </button>
                          }
                        />
                      </td>
                    </tr>
                  )}
                  {filteredProducts.map((p, i) => {
                    const m = getProductMetrics(p);
                    const unitProfit =
                      p.salePrice / packageUnitsFor(p) - p.purchasePrice / packageUnitsFor(p);
                    return (
                      <motion.tr
                        key={p.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25, delay: Math.min(i * 0.025, 0.2) }}
                        className="hover:bg-gold-500/[0.04] transition group"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-silver-50">{p.name}</div>
                          <div className="text-xs text-silver-500 flex items-center gap-1.5">
                            <span>{p.dosage}</span>
                            <span>· {packageUnitsFor(p)} {stockUnitPlural(p.name)}/caixa</span>
                            {p.sku && <span>· {p.sku}</span>}
                            {p.supplier && <span>· {p.supplier}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={cn(
                                "tabular-nums font-semibold",
                                m.outOfStock
                                  ? "text-rose-300"
                                  : m.lowStock
                                  ? "text-gold-300"
                                  : "text-silver-50"
                              )}
                            >
                              {p.stockQty}
                            </span>
                            {m.outOfStock && (
                              <motion.span
                                animate={{ scale: [1, 1.15, 1] }}
                                transition={{ duration: 1.6, repeat: Infinity }}
                                className="badge bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40 text-[9px]"
                              >
                                ESGOTADO
                              </motion.span>
                            )}
                            {!m.outOfStock && m.lowStock && (
                              <span className="badge bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/40 text-[9px]">
                                BAIXO
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-silver-500 tabular-nums">
                            mín {p.minStock}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-silver-200">
                          {formatBRL(p.purchasePrice)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-silver-50 font-semibold">
                          {formatBRL(p.salePrice)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-300">
                          {formatBRL(unitProfit)}
                          <div className="text-[10px] text-silver-500">
                            por {stockUnitSingular(p.name)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gold-300">
                          {formatPct(m.margin)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-silver-100">
                          {formatBRL(m.stockValue)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition">
                            <button
                              className="p-1.5 rounded-lg text-silver-400 hover:bg-gold-500/10 hover:text-gold-300 transition"
                              onClick={() => {
                                setEditing(p);
                                setProductModal(true);
                              }}
                              aria-label="Editar"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="p-1.5 rounded-lg text-silver-400 hover:bg-rose-500/15 hover:text-rose-300 transition"
                              onClick={() => setConfirmDel(p)}
                              aria-label="Excluir"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="mov"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="card overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-900/80 sticky top-0 z-10">
                  <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-silver-500">
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 font-semibold">Produto</th>
                    <th className="px-4 py-3 font-semibold text-right">Qtd</th>
                    <th className="px-4 py-3 font-semibold text-right">Custo un.</th>
                    <th className="px-4 py-3 font-semibold">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-900/15">
                  {recentMovements.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <Empty
                          icon={RotateCcw}
                          title="Nenhuma movimentação"
                          description="As entradas, saídas e ajustes de estoque aparecem aqui."
                          action={
                            <button
                              className="btn-primary"
                              onClick={() => setMovementModal("entry")}
                              disabled={products.length === 0}
                            >
                              <PackagePlus size={16} /> Registrar entrada
                            </button>
                          }
                        />
                      </td>
                    </tr>
                  )}
                  {recentMovements.map((m, i) => (
                    <motion.tr
                      key={m.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.15) }}
                      className="hover:bg-gold-500/[0.04] transition"
                    >
                      <td className="px-4 py-3 text-silver-300 whitespace-nowrap">
                        {formatDate(m.date)}
                      </td>
                      <td className="px-4 py-3">
                        <MovementBadge type={m.type} />
                      </td>
                      <td className="px-4 py-3 text-silver-100">
                        {nameFor(m.productId)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        <span
                          className={cn(
                            m.type === "entry"
                              ? "text-emerald-300"
                              : m.type === "exit"
                              ? "text-rose-300"
                              : "text-silver-200"
                          )}
                        >
                          {m.type === "entry" ? "+" : m.type === "exit" ? "−" : "±"}
                          {m.qty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-silver-300">
                        {m.unitCost ? formatBRL(m.unitCost) : "—"}
                      </td>
                      <td className="px-4 py-3 text-silver-400 text-xs">
                        {m.reason || "—"}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAIS */}
      <Modal
        open={productModal}
        onClose={() => {
          setProductModal(false);
          setEditing(null);
        }}
        title={editing ? "Editar produto" : "Novo produto"}
        description="Defina preço de compra, preço de venda e estoque inicial."
        size="lg"
      >
        <ProductForm
          initial={editing || undefined}
          onSubmit={(data) => {
            if (editing) {
              updateProduct(editing.id, data);
              toast.success("Produto atualizado");
            } else {
              addProduct(data);
              toast.success("Produto cadastrado");
            }
            setProductModal(false);
            setEditing(null);
          }}
          onCancel={() => {
            setProductModal(false);
            setEditing(null);
          }}
        />
      </Modal>

      <Modal
        open={!!movementModal}
        onClose={() => setMovementModal(null)}
        title={
          movementModal === "entry"
            ? "Registrar entrada"
            : movementModal === "exit"
            ? "Registrar saída"
            : "Ajuste de estoque"
        }
        description={
          movementModal === "entry"
            ? "Compra de fornecedor, reposição, etc. Atualiza o preço de compra do produto."
            : movementModal === "exit"
            ? "Saída manual (perda, doação, uso interno). Vendas registram saída automaticamente."
            : "Acerto de inventário (+ ou −)."
        }
        size="md"
      >
        {movementModal && products.length === 0 ? (
          <Empty
            icon={Boxes}
            title="Cadastre um produto primeiro"
            description="Você precisa ter ao menos um produto no catálogo para movimentar estoque."
          />
        ) : movementModal ? (
          <MovementForm
            type={movementModal}
            onDone={() => {
              toast.success(
                movementModal === "entry"
                  ? "Entrada registrada"
                  : movementModal === "exit"
                  ? "Saída registrada"
                  : "Ajuste registrado"
              );
              setMovementModal(null);
            }}
            onCancel={() => setMovementModal(null)}
          />
        ) : null}
      </Modal>

      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Excluir produto"
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
                  deleteProduct(confirmDel.id);
                  toast.success("Produto excluído");
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
          Excluir <strong className="text-gold-300">{confirmDel?.name} · {confirmDel?.dosage}</strong>? Todas as movimentações desse produto serão removidas.
        </p>
      </Modal>
    </>
  );
}

// ─── helpers visuais ─────────────────────────────
const toneMap: Record<
  string,
  { icon: string; bar: string }
> = {
  gold: { icon: "bg-gold-500/15 text-gold-300", bar: "from-gold-500/40 to-gold-700/10" },
  emerald: {
    icon: "bg-emerald-500/15 text-emerald-300",
    bar: "from-emerald-500/40 to-emerald-700/10",
  },
  silver: {
    icon: "bg-silver-500/15 text-silver-200",
    bar: "from-silver-500/40 to-silver-700/10",
  },
  amber: { icon: "bg-amber-500/15 text-amber-300", bar: "from-amber-500/40 to-amber-700/10" },
  rose: { icon: "bg-rose-500/15 text-rose-300", bar: "from-rose-500/40 to-rose-700/10" },
  ink: { icon: "bg-ink-700 text-silver-200", bar: "from-silver-700/40 to-ink-700" },
};

function Kpi({
  icon: Icon,
  label,
  value,
  formatter,
  sub,
  tone,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: number;
  formatter: (v: number) => string;
  sub?: string;
  tone: keyof typeof toneMap;
}) {
  const t = toneMap[tone];
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="card p-4 lg:p-5 relative overflow-hidden"
    >
      <div
        className={cn(
          "absolute -top-12 -right-12 size-32 rounded-full blur-2xl bg-gradient-to-br opacity-50",
          t.bar
        )}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-gold-400/90 uppercase tracking-[0.14em]">
            {label}
          </p>
          <span className={cn("size-8 rounded-lg grid place-items-center", t.icon)}>
            <Icon size={15} />
          </span>
        </div>
        <p className="text-xl lg:text-2xl font-bold text-silver-50 mt-3 tabular-nums">
          <AnimatedNumber value={value} format={formatter} />
        </p>
        {sub && <p className="text-xs text-silver-500 mt-1 truncate">{sub}</p>}
      </div>
    </motion.div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition",
        active ? "text-gold-100" : "text-silver-400 hover:text-silver-100"
      )}
    >
      {active && (
        <motion.span
          layoutId="estoque-tab"
          className="absolute inset-0 rounded-lg bg-gold-800/30 ring-1 ring-gold-700/40"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

function MovementBadge({ type }: { type: "entry" | "exit" | "adjustment" }) {
  if (type === "entry")
    return (
      <span className="badge bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
        <ArrowDownCircle size={11} /> Entrada
      </span>
    );
  if (type === "exit")
    return (
      <span className="badge bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30">
        <ArrowUpCircle size={11} /> Saída
      </span>
    );
  return (
    <span className="badge bg-silver-500/10 text-silver-200 ring-1 ring-silver-500/30">
      <Scale size={11} /> Ajuste
    </span>
  );
}
