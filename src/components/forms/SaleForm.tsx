import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Wallet,
  Receipt,
  CreditCard,
  ChevronDown,
  Sparkles,
  Percent,
} from "lucide-react";
import type { Sale } from "@/lib/types";
import { useStore, getSaleFinancials } from "@/store/useStore";
import { formatBRL, formatPct, todayISO } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  purchasePriceForVariant,
  salePriceForVariant,
  stockUnitPlural,
  stockUnitText,
  variantsForProduct,
} from "@/lib/productVariants";
import { ClientCombobox } from "@/components/forms/ClientCombobox";
import { CurrencyInput, NumberInput } from "@/components/forms/CurrencyInput";

interface Props {
  initial?: Sale;
  onSubmit: (data: Omit<Sale, "id">) => void;
  onCancel: () => void;
}

export function SaleForm({ initial, onSubmit, onCancel }: Props) {
  const settings = useStore((s) => s.settings);
  const products = useStore((s) => s.products);
  const upsertClient = useStore((s) => s.upsertClientByName);
  const defaults = settings.feeDefaults ?? { cardFeePct: 3.5, installmentFeePct: 1.0 };

  const empty: Omit<Sale, "id"> = {
    date: todayISO(),
    product: settings.products[0] || "Tirzepatida Mounjaro",
    dosage: settings.dosages[1] || "5mg",
    client: "",
    contact: "",
    qty: 1,
    purchasePrice: 0,
    salePrice: 0,
    payment: settings.paymentMethods[0] || "Pix",
    status: settings.saleStatuses[0] || "Pago",
    notes: "",
    productId: undefined,
    productVariant: "1 ampola",
    productVariantUnits: 1,
    signal: undefined,
    installments: 1,
    cardFeePct: defaults.cardFeePct,
    installmentFeePct: defaults.installmentFeePct,
    otherFees: 0,
  };

  const [form, setForm] = useState<Omit<Sale, "id">>(() =>
    initial
      ? {
          ...initial,
          installments: initial.installments ?? 1,
          cardFeePct: initial.cardFeePct ?? defaults.cardFeePct,
          installmentFeePct: initial.installmentFeePct ?? defaults.installmentFeePct,
          otherFees: initial.otherFees ?? 0,
        }
      : empty
  );

  const [showSignal, setShowSignal] = useState<boolean>(!!initial?.signal);
  const [showFees, setShowFees] = useState<boolean>(true);
  const [confirmNegativeStock, setConfirmNegativeStock] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        ...initial,
        installments: initial.installments ?? 1,
        cardFeePct: initial.cardFeePct ?? defaults.cardFeePct,
        installmentFeePct: initial.installmentFeePct ?? defaults.installmentFeePct,
        otherFees: initial.otherFees ?? 0,
      });
      setShowSignal(!!initial.signal);
    }
  }, [initial]);

  const fin = useMemo(
    () => getSaleFinancials({ ...form, id: "tmp" } as Sale),
    [form]
  );

  const linkedProduct = form.productId
    ? products.find((p) => p.id === form.productId)
    : undefined;
  const quickProducts = settings.products.filter(
    (name) => !products.some((p) => p.name === name)
  );
  const productChoice = linkedProduct
    ? `stock:${linkedProduct.id}`
    : quickProducts.includes(form.product)
    ? `quick:${form.product}`
    : "manual";
  const hasProductOptions = products.length > 0 || quickProducts.length > 0;
  const variantOptions =
    productChoice !== "manual" ? variantsForProduct(settings, form.product, linkedProduct) : [];
  const variantChoice =
    variantOptions.find(
      (variant) =>
        variant.label === form.productVariant ||
        variant.units === form.productVariantUnits
    )?.id || variantOptions[0]?.id || "";
  const stockUnitsToConsume = form.qty * Math.max(1, form.productVariantUnits || 1);
  const editableStockCredit =
    initial?.productId && linkedProduct?.id === initial.productId
      ? initial.qty * Math.max(1, initial.productVariantUnits || 1)
      : 0;
  const availableStock = (linkedProduct?.stockQty || 0) + editableStockCredit;
  const unitPlural = stockUnitPlural(form.product, form.productVariant);
  const willOverstock =
    linkedProduct && stockUnitsToConsume > availableStock;
  const isCard = form.payment === "Cartão Crédito";

  const valid = form.client.trim() && form.qty > 0 && form.salePrice >= 0;

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    if (k === "qty" || k === "productId" || k === "productVariantUnits") {
      setConfirmNegativeStock(false);
    }
    setForm((f) => ({ ...f, [k]: v }));
  }

  function pickProduct(id: string) {
    if (!id) {
      update("productId", undefined);
      return;
    }
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const variant = variantsForProduct(settings, p.name, p)[0];
    const units = variant?.units || 1;
    setForm((f) => ({
      ...f,
      productId: id,
      product: p.name,
      dosage: p.dosage,
      productVariant: variant?.label,
      productVariantUnits: units,
      purchasePrice: variant ? purchasePriceForVariant(p, variant) : p.purchasePrice,
      salePrice: variant ? salePriceForVariant(p, variant) : p.salePrice,
    }));
  }

  function selectProductChoice(value: string) {
    setConfirmNegativeStock(false);
    if (value.startsWith("stock:")) {
      pickProduct(value.slice("stock:".length));
      return;
    }

    if (value.startsWith("quick:")) {
      const product = value.slice("quick:".length);
      const variant = variantsForProduct(settings, product)[0];
      setForm((f) => ({
        ...f,
        productId: undefined,
        product,
        dosage: f.dosage || settings.dosages[0] || "",
        productVariant: variant?.label,
        productVariantUnits: variant?.units || 1,
      }));
      return;
    }

    setForm((f) => ({ ...f, productId: undefined, productVariant: undefined, productVariantUnits: undefined }));
  }

  function selectVariant(id: string) {
    setConfirmNegativeStock(false);
    const variant = variantOptions.find((option) => option.id === id);
    if (!variant) return;
    setForm((f) => {
      const product = f.productId ? products.find((p) => p.id === f.productId) : undefined;
      return {
        ...f,
        productVariant: variant.label,
        productVariantUnits: variant.units,
        purchasePrice: product
          ? purchasePriceForVariant(product, variant)
          : f.purchasePrice,
        salePrice: product
          ? salePriceForVariant(product, variant)
          : f.salePrice,
      };
    });
  }

  function toggleSignal(on: boolean) {
    setShowSignal(on);
    if (on && !form.signal) {
      update("signal", {
        amount: 0,
        method: settings.paymentMethods[0] || "Pix",
        date: todayISO(),
      });
    } else if (!on) {
      update("signal", undefined);
    }
  }

  function updateSignal<K extends keyof NonNullable<Sale["signal"]>>(k: K, v: any) {
    setForm((f) => ({
      ...f,
      signal: { ...(f.signal || { amount: 0, method: "Pix" }), [k]: v },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    if (willOverstock && !confirmNegativeStock) {
      setConfirmNegativeStock(true);
      return;
    }
    // Garante que o cliente esteja no catálogo (cria se não existir)
    if (form.client.trim()) {
      upsertClient(form.client, form.contact);
    }
    const data = {
      ...form,
      installments: isCard ? Math.max(form.installments ?? 1, 1) : 1,
      signal: showSignal && form.signal && form.signal.amount > 0 ? form.signal : undefined,
    };
    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {willOverstock && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/40 px-3.5 py-2.5 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle size={14} />
          <div className="flex-1">
            Esta venda consome {stockUnitText(form.product, stockUnitsToConsume, form.productVariant)}, maior que o estoque disponível ({availableStock} {unitPlural}).
            {confirmNegativeStock && (
              <span className="block mt-1 text-rose-200">
                Clique em registrar novamente para confirmar a baixa negativa.
              </span>
            )}
          </div>
        </div>
      )}

      {/* ───── DADOS DA VENDA ───── */}
      <Section icon={Receipt} title="Dados da venda">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Data">
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              required
            />
          </Field>
          <Field label="Quantidade">
            <NumberInput
              min={1}
              value={form.qty}
              onChange={(n) => update("qty", Math.max(1, n))}
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Produto">
            {hasProductOptions ? (
              <div className="space-y-2">
                <select
                  className="input"
                  value={productChoice}
                  onChange={(e) => selectProductChoice(e.target.value)}
                >
                  <option value="manual">Produto manual</option>
                  {products.length > 0 && (
                    <optgroup label="Produtos cadastrados">
                      {products.map((p) => (
                        <option key={p.id} value={`stock:${p.id}`}>
                          {p.name} · {p.dosage} (estoque: {p.stockQty})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {quickProducts.length > 0 && (
                    <optgroup label="Lista rápida">
                      {quickProducts.map((p) => (
                        <option key={p} value={`quick:${p}`}>
                          {p}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {productChoice === "manual" && (
                  <input
                    className="input"
                    value={form.product}
                    onChange={(e) => update("product", e.target.value)}
                  />
                )}
                {linkedProduct && (
                  <p className="text-[11px] text-silver-400">
                    Preços preenchidos pela variação. Estoque será decrementado em{" "}
                    <strong className="text-gold-300">{stockUnitText(form.product, stockUnitsToConsume, form.productVariant)}</strong> ao salvar.
                  </p>
                )}
              </div>
            ) : (
              <input
                className="input"
                value={form.product}
                onChange={(e) => update("product", e.target.value)}
              />
            )}
          </Field>
          <Field label="Dosagem">
            <select
              className="input"
              value={form.dosage}
              onChange={(e) => update("dosage", e.target.value)}
              disabled={!!linkedProduct}
            >
              {settings.dosages.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
        </div>

        {variantOptions.length > 0 && (
          <Field label="Subitem">
            <select
              className="input"
              value={variantChoice}
              onChange={(e) => selectVariant(e.target.value)}
            >
              {variantOptions.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-silver-500 mt-1">
              4 {unitPlural} é caixa fechada; 1 a 3 são cobradas conforme o preço do subitem.
            </p>
          </Field>
        )}

        <ClientCombobox
          name={form.client}
          phone={form.contact}
          required
          onChange={(name, phone) =>
            setForm((f) => ({ ...f, client: name, contact: phone }))
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Preço de compra do subitem">
            <CurrencyInput
              value={form.purchasePrice}
              onChange={(n) => update("purchasePrice", n)}
            />
          </Field>
          <Field label="Preço de venda do subitem">
            <CurrencyInput
              value={form.salePrice}
              onChange={(n) => update("salePrice", n)}
              required
            />
          </Field>
        </div>
      </Section>

      {/* ───── SINAL ───── */}
      <Section
        icon={Wallet}
        title="Sinal / entrada"
        right={
          <Toggle
            checked={showSignal}
            onChange={toggleSignal}
            label={showSignal ? "Houve sinal" : "Sem sinal"}
          />
        }
      >
        <AnimatePresence initial={false}>
          {showSignal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <Field label="Valor do sinal">
                  <CurrencyInput
                    value={form.signal?.amount ?? 0}
                    onChange={(n) => updateSignal("amount", n)}
                  />
                </Field>
                <Field label="Método do sinal">
                  <select
                    className="input"
                    value={form.signal?.method || ""}
                    onChange={(e) => updateSignal("method", e.target.value)}
                  >
                    {settings.paymentMethods.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Data do sinal">
                  <input
                    type="date"
                    className="input"
                    value={form.signal?.date || todayISO()}
                    onChange={(e) => updateSignal("date", e.target.value)}
                  />
                </Field>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      {/* ───── PAGAMENTO DO SALDO ───── */}
      <Section icon={CreditCard} title={showSignal ? "Pagamento do saldo" : "Pagamento"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Método">
            <select
              className="input"
              value={form.payment}
              onChange={(e) => update("payment", e.target.value)}
            >
              {settings.paymentMethods.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className="input"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              {settings.saleStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        <AnimatePresence initial={false}>
          {isCard && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-3">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-gold-400/90 font-semibold">
                  <Percent size={11} /> Parcelamento e taxas
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Parcelas">
                    <select
                      className="input"
                      value={form.installments ?? 1}
                      onChange={(e) => update("installments", Number(e.target.value))}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}× {n === 1 ? "(à vista)" : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Taxa cartão (%)">
                    <NumberInput
                      step="0.0001"
                      min={0}
                      max={100}
                      value={form.cardFeePct ?? 0}
                      onChange={(n) => update("cardFeePct", n)}
                    />
                  </Field>
                  <Field label="Taxa por parcela extra (%)">
                    <NumberInput
                      step="0.0001"
                      min={0}
                      max={100}
                      value={form.installmentFeePct ?? 0}
                      onChange={(n) => update("installmentFeePct", n)}
                    />
                  </Field>
                </div>

                {/* Cards de parcelas */}
                {(form.installments ?? 1) > 1 && fin.cardBase > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-ink-950/60 border border-gold-900/30 p-3"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-silver-500 mb-2">
                      Plano de parcelas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: form.installments ?? 1 }, (_, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gold-500/10 text-gold-200 ring-1 ring-gold-700/30 text-[11px] font-mono tabular-nums"
                        >
                          {i + 1}× {formatBRL(fin.installmentValue)}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-silver-500 mt-2">
                      Total no cartão: <strong className="text-silver-200">{formatBRL(fin.cardBase + fin.cardFee + fin.installmentFee)}</strong> · Taxa efetiva: <strong className="text-gold-300">{formatPct(fin.effectiveFeePct)}</strong>
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Field label="Outras taxas">
          <CurrencyInput
            value={form.otherFees ?? 0}
            onChange={(n) => update("otherFees", n)}
          />
          <p className="text-[11px] text-silver-500 mt-1">
            Maquininha extra, frete, etc.
          </p>
        </Field>
      </Section>

      {/* ───── OBSERVAÇÕES ───── */}
      <Field label="Observações">
        <textarea
          className="input min-h-[64px]"
          value={form.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Opcional"
        />
      </Field>

      {/* ───── RESUMO FINANCEIRO ───── */}
      <button
        type="button"
        onClick={() => setShowFees((s) => !s)}
        className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] font-semibold text-gold-400 hover:text-gold-300 transition"
      >
        <Sparkles size={11} />
        Resumo financeiro
        <motion.span animate={{ rotate: showFees ? 0 : -90 }}>
          <ChevronDown size={12} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {showFees && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl bg-gradient-to-br from-ink-950/80 to-gold-950/30 border border-gold-700/30 p-5 space-y-1.5 mt-3">
              <Line label="Total bruto da venda" value={formatBRL(fin.totalSale)} />
              {fin.signalAmount > 0 && (
                <Line
                  label={`Sinal recebido (${fin.signalMethod || "—"})`}
                  value={`− ${formatBRL(fin.signalAmount)}`}
                  tone="silver"
                />
              )}
              {fin.signalAmount > 0 && (
                <Line
                  label={`Saldo a receber (${fin.remainingMethod})`}
                  value={formatBRL(fin.remainingAmount)}
                  tone="silver"
                  thin
                />
              )}
              {fin.cardFee > 0 && (
                <Line
                  label={`Taxa cartão (${formatPct((form.cardFeePct ?? 0) / 100)})`}
                  value={`− ${formatBRL(fin.cardFee)}`}
                  tone="rose"
                />
              )}
              {fin.installmentFee > 0 && (
                <Line
                  label={`Taxa de parcelamento (${form.installments}×)`}
                  value={`− ${formatBRL(fin.installmentFee)}`}
                  tone="rose"
                />
              )}
              {fin.otherFees > 0 && (
                <Line
                  label="Outras taxas"
                  value={`− ${formatBRL(fin.otherFees)}`}
                  tone="rose"
                />
              )}
              <div className="gold-divider my-2" />
              <Line
                label="Valor líquido a receber"
                value={formatBRL(fin.netReceived)}
                highlight
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3">
                <Mini
                  label="Custo"
                  value={formatBRL(fin.totalPurchase)}
                  tone="silver"
                />
                <Mini
                  label="Lucro líquido"
                  value={formatBRL(fin.netProfit)}
                  tone="emerald"
                />
                <Mini
                  label="Margem líquida"
                  value={formatPct(fin.netMargin)}
                  tone="gold"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={!valid}>
          {initial ? "Salvar alterações" : "Registrar venda"}
        </button>
      </div>
    </form>
  );
}

// ─── helpers ─────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  right,
}: {
  icon: React.ComponentType<any>;
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-gold-400">
          <Icon size={13} />
          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold">
            {title}
          </span>
          <span className="h-px flex-1 bg-gold-900/30 min-w-[2rem] ml-1" />
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium transition ring-1",
        checked
          ? "bg-gold-500/15 text-gold-200 ring-gold-500/40"
          : "bg-ink-800/60 text-silver-400 ring-ink-600 hover:text-silver-200"
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full transition",
          checked ? "bg-gold-400" : "bg-silver-500"
        )}
      />
      {label}
    </button>
  );
}

function Line({
  label,
  value,
  tone,
  highlight,
  thin,
}: {
  label: string;
  value: string;
  tone?: "silver" | "rose" | "emerald";
  highlight?: boolean;
  thin?: boolean;
}) {
  const valueTone =
    tone === "rose"
      ? "text-rose-300"
      : tone === "emerald"
      ? "text-emerald-300"
      : tone === "silver"
      ? "text-silver-300"
      : highlight
      ? "text-gold-200"
      : "text-silver-100";
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        highlight ? "py-1.5" : thin ? "py-0.5" : "py-0.5"
      )}
    >
      <span
        className={cn(
          highlight
            ? "text-[11px] uppercase tracking-[0.18em] font-bold text-gold-400"
            : thin
            ? "text-[11px] text-silver-500"
            : "text-xs text-silver-400"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums font-mono",
          highlight ? "text-lg font-bold" : "text-sm",
          valueTone
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "silver" | "emerald" | "gold";
}) {
  const t =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "gold"
      ? "text-gold-300"
      : "text-silver-200";
  return (
    <div className="rounded-xl bg-ink-950/60 border border-gold-900/20 px-3 py-2.5 text-center">
      <p className="text-[9px] uppercase tracking-[0.18em] text-silver-500 font-semibold">
        {label}
      </p>
      <p className={cn("text-sm font-bold mt-1 tabular-nums font-mono", t)}>{value}</p>
    </div>
  );
}
