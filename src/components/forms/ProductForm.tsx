import { useEffect, useState } from "react";
import type { Product, ProductVariant } from "@/lib/types";
import { useStore } from "@/store/useStore";
import { formatBRL, formatPct } from "@/lib/utils";
import {
  DEFAULT_PACKAGE_UNITS,
  defaultAmpouleVariants,
  defaultVariantsForProduct,
  priceForVariant,
  stockUnitPlural,
  stockUnitSingular,
} from "@/lib/productVariants";
import { CurrencyInput, NumberInput } from "@/components/forms/CurrencyInput";

interface Props {
  initial?: Product;
  onSubmit: (data: Omit<Product, "id" | "createdAt">) => void;
  onCancel: () => void;
}

const empty: Omit<Product, "id" | "createdAt"> = {
  name: "Tirzepatida Mounjaro",
  dosage: "5mg",
  sku: "",
  purchasePrice: 0,
  salePrice: 0,
  packageUnits: DEFAULT_PACKAGE_UNITS,
  variants: defaultAmpouleVariants,
  stockQty: 0,
  minStock: 2,
  supplier: "",
  notes: "",
};

export function ProductForm({ initial, onSubmit, onCancel }: Props) {
  const settings = useStore((s) => s.settings);
  const [form, setForm] = useState<Omit<Product, "id" | "createdAt">>(() =>
    initial
      ? {
          name: initial.name,
          dosage: initial.dosage,
          sku: initial.sku,
          purchasePrice: initial.purchasePrice,
          salePrice: initial.salePrice,
          packageUnits: initial.packageUnits || DEFAULT_PACKAGE_UNITS,
          variants: initial.variants?.length ? initial.variants : defaultVariantsForProduct(initial.name),
          stockQty: initial.stockQty,
          minStock: initial.minStock,
          supplier: initial.supplier,
          notes: initial.notes,
        }
      : { ...empty }
  );

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        dosage: initial.dosage,
        sku: initial.sku,
        purchasePrice: initial.purchasePrice,
        salePrice: initial.salePrice,
        packageUnits: initial.packageUnits || DEFAULT_PACKAGE_UNITS,
        variants: initial.variants?.length ? initial.variants : defaultVariantsForProduct(initial.name),
        stockQty: initial.stockQty,
        minStock: initial.minStock,
        supplier: initial.supplier,
        notes: initial.notes,
      });
    }
  }, [initial]);

  const ampoulePurchase = form.purchasePrice / Math.max(1, form.packageUnits || DEFAULT_PACKAGE_UNITS);
  const ampouleSale = form.salePrice / Math.max(1, form.packageUnits || DEFAULT_PACKAGE_UNITS);
  const margin = form.salePrice
    ? (form.salePrice - form.purchasePrice) / form.salePrice
    : 0;
  const markup = form.purchasePrice
    ? (form.salePrice - form.purchasePrice) / form.purchasePrice
    : 0;
  const unitProfit = ampouleSale - ampoulePurchase;
  const stockValue = form.stockQty * ampoulePurchase;
  const unitSingular = stockUnitSingular(form.name);
  const unitPlural = stockUnitPlural(form.name);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => {
      if (k === "name" && typeof v === "string") {
        return { ...f, [k]: v, variants: defaultVariantsForProduct(v) };
      }
      return { ...f, [k]: v };
    });
  }

  function updateVariant(id: string, patch: Partial<ProductVariant>) {
    setForm((f) => ({
      ...f,
      variants: (f.variants || defaultAmpouleVariants).map((variant) =>
        variant.id === id ? { ...variant, ...patch } : variant
      ),
    }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.name.trim() || form.salePrice <= 0) return;
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Produto">
          <input
            className="input"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </Field>
        <Field label="Dosagem">
          <select
            className="input"
            value={form.dosage}
            onChange={(e) => update("dosage", e.target.value)}
          >
            {settings.dosages.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="SKU / Código">
          <input
            className="input"
            value={form.sku || ""}
            onChange={(e) => update("sku", e.target.value)}
            placeholder="Opcional"
          />
        </Field>
        <Field label="Fornecedor">
          <input
            className="input"
            value={form.supplier || ""}
            onChange={(e) => update("supplier", e.target.value)}
            placeholder="Opcional"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Preço de compra da caixa">
          <CurrencyInput
            value={form.purchasePrice}
            onChange={(n) => update("purchasePrice", n)}
          />
        </Field>
        <Field label="Preço de venda da caixa">
          <CurrencyInput
            value={form.salePrice}
            onChange={(n) => update("salePrice", n)}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label={`${unitPlural[0].toUpperCase()}${unitPlural.slice(1)} por caixa`}>
          <NumberInput
            min={1}
            value={form.packageUnits || DEFAULT_PACKAGE_UNITS}
            onChange={(n) => update("packageUnits", Math.max(1, n))}
          />
        </Field>
        <Field label={initial ? `Estoque atual (${unitPlural})` : `Estoque inicial (${unitPlural})`}>
          <NumberInput
            min={0}
            value={form.stockQty}
            onChange={(n) => update("stockQty", Math.max(0, n))}
          />
        </Field>
        <Field label={`Estoque mínimo (${unitPlural})`}>
          <NumberInput
            min={0}
            value={form.minStock}
            onChange={(n) => update("minStock", Math.max(0, n))}
          />
        </Field>
      </div>

      <Field label="Observações">
        <textarea
          className="input min-h-[64px]"
          value={form.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </Field>

      <div className="rounded-xl bg-gold-500/10 border border-gold-700/30 px-4 py-3 text-xs text-silver-300">
        Caixa fechada: <strong className="text-gold-200">{form.packageUnits || DEFAULT_PACKAGE_UNITS} {unitPlural}</strong>.{" "}
        Venda por {unitSingular}: <strong className="text-gold-200">{formatBRL(ampouleSale)}</strong>.
      </div>

      <div className="rounded-xl bg-ink-950/50 border border-gold-900/30 p-4 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold-400 font-semibold">
            Subitens e preços
          </p>
          <p className="text-[11px] text-silver-500 mt-1">
            Deixe em branco para usar o preço proporcional da caixa.
          </p>
        </div>
        <div className="space-y-2">
          {(form.variants || defaultAmpouleVariants).map((variant) => (
            <div key={variant.id} className="grid grid-cols-1 sm:grid-cols-[1fr_150px_150px] gap-2 items-end rounded-lg bg-ink-900/50 p-2 ring-1 ring-gold-900/20">
              <div>
                <span className="text-sm text-silver-100">{variant.label}</span>
                <span className="block text-[11px] text-silver-500">
                  {variant.units} {variant.units === 1 ? stockUnitSingular(form.name, variant.label) : stockUnitPlural(form.name, variant.label)}
                </span>
              </div>
              <label className="block">
                <span className="label">Compra</span>
                <CurrencyInput
                  value={
                    variant.purchasePrice ??
                    priceForVariant(form.purchasePrice, variant.units, form.packageUnits)
                  }
                  onChange={(n) => updateVariant(variant.id, { purchasePrice: n })}
                />
              </label>
              <label className="block">
                <span className="label">Venda</span>
                <CurrencyInput
                  value={
                    variant.salePrice ??
                    priceForVariant(form.salePrice, variant.units, form.packageUnits)
                  }
                  onChange={(n) => updateVariant(variant.id, { salePrice: n })}
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-ink-950/60 border border-gold-800/30 px-4 py-3 grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-4 gap-3">
        <Calc label={`Lucro/${unitSingular}`} value={formatBRL(unitProfit)} tone="text-emerald-300" />
        <Calc label="Margem caixa" value={formatPct(margin)} tone="text-gold-300" />
        <Calc label="Markup" value={formatPct(markup)} tone="text-silver-200" />
        <Calc label="Valor estoque" value={formatBRL(stockValue)} tone="text-silver-50" />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={!form.name.trim() || form.salePrice <= 0}
        >
          {initial ? "Salvar alterações" : "Cadastrar produto"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Calc({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="text-center">
      <p className="text-[9px] uppercase tracking-[0.18em] text-silver-500 font-semibold">
        {label}
      </p>
      <p className={`text-sm font-bold mt-1 tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
