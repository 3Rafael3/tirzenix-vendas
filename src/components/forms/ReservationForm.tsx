import { useEffect, useState } from "react";
import type { Reservation } from "@/lib/types";
import { useStore, getReservationTotals } from "@/store/useStore";
import { formatBRL, todayISO } from "@/lib/utils";
import { salePriceForVariant, stockUnitPlural, variantsForProduct } from "@/lib/productVariants";
import { ClientCombobox } from "@/components/forms/ClientCombobox";
import { CurrencyInput, NumberInput } from "@/components/forms/CurrencyInput";

interface Props {
  initial?: Reservation;
  onSubmit: (data: Omit<Reservation, "id">) => void;
  onCancel: () => void;
}

const empty: Omit<Reservation, "id"> = {
  date: todayISO(),
  client: "",
  contact: "",
  product: "T.G.",
  dosage: "5mg",
  qty: 1,
  estimatedPrice: 0,
  signalPaid: 0,
  signalMethod: "Pix",
  deliveryDate: "",
  payment: "Pix",
  status: "A Reservar",
  notes: "",
  productId: undefined,
  productVariant: "1 ampola",
  productVariantUnits: 1,
};

export function ReservationForm({ initial, onSubmit, onCancel }: Props) {
  const settings = useStore((s) => s.settings);
  const products = useStore((s) => s.products);
  const upsertClient = useStore((s) => s.upsertClientByName);
  const [form, setForm] = useState<Omit<Reservation, "id">>(() =>
    initial ? { ...initial } : { ...empty }
  );

  useEffect(() => {
    if (initial) setForm({ ...initial });
  }, [initial]);

  const totals = getReservationTotals({ ...form, id: "tmp" } as Reservation);
  const valid = form.client.trim() && form.qty > 0;
  const linked = form.productId
    ? products.find((p) => p.id === form.productId)
    : undefined;
  const quickProducts = settings.products.filter(
    (name) => !products.some((p) => p.name === name)
  );
  const productChoice = linked
    ? `stock:${linked.id}`
    : quickProducts.includes(form.product)
    ? `quick:${form.product}`
    : "manual";
  const hasProductOptions = products.length > 0 || quickProducts.length > 0;
  const variantOptions =
    productChoice !== "manual" ? variantsForProduct(settings, form.product, linked) : [];
  const variantChoice =
    variantOptions.find(
      (variant) =>
        variant.label === form.productVariant ||
        variant.units === form.productVariantUnits
    )?.id || variantOptions[0]?.id || "";
  const unitPlural = stockUnitPlural(form.product, form.productVariant);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
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
      estimatedPrice: variant ? salePriceForVariant(p, variant) : p.salePrice,
    }));
  }

  function selectProductChoice(value: string) {
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
    const variant = variantOptions.find((option) => option.id === id);
    if (!variant) return;
    setForm((f) => {
      const product = f.productId ? products.find((p) => p.id === f.productId) : undefined;
      return {
        ...f,
        productVariant: variant.label,
        productVariantUnits: variant.units,
        estimatedPrice: product
          ? salePriceForVariant(product, variant)
          : f.estimatedPrice,
      };
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        if (form.client.trim()) upsertClient(form.client, form.contact);
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Data da reserva">
          <input
            type="date"
            className="input"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            required
          />
        </Field>
        <Field label="Previsão de entrega">
          <input
            type="date"
            className="input"
            value={form.deliveryDate || ""}
            onChange={(e) => update("deliveryDate", e.target.value)}
          />
        </Field>
      </div>

      <ClientCombobox
        name={form.client}
        phone={form.contact}
        required
        onChange={(n, p) => setForm((f) => ({ ...f, client: n, contact: p }))}
      />

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
              {linked && (
                <p className="text-[11px] text-silver-400">
                  O estoque não é movimentado em reservas. Será reduzido ao converter em venda.
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
            disabled={!!linked}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Quantidade">
          <NumberInput
            min={1}
            value={form.qty}
            onChange={(n) => update("qty", Math.max(1, n))}
          />
        </Field>
        <Field label="Preço estimado do subitem">
          <CurrencyInput
            value={form.estimatedPrice}
            onChange={(n) => update("estimatedPrice", n)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Sinal pago">
          <CurrencyInput
            value={form.signalPaid}
            onChange={(n) => update("signalPaid", n)}
          />
        </Field>
        <Field label="Método do sinal">
          <select
            className="input"
            value={form.signalMethod || ""}
            onChange={(e) => update("signalMethod", e.target.value)}
            disabled={form.signalPaid <= 0}
          >
            <option value="">— sem sinal —</option>
            {settings.paymentMethods.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Pagamento previsto (saldo)">
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
            {settings.reservationStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Observações">
        <textarea
          className="input min-h-[64px]"
          value={form.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
        />
      </Field>

      <div className="rounded-xl bg-ink-950/60 border border-gold-800/30 px-4 py-3 grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] text-silver-500 font-semibold">
            Total estimado
          </p>
          <p className="text-sm font-bold mt-1 tabular-nums text-silver-50">
            {formatBRL(totals.total)}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] text-silver-500 font-semibold">
            Saldo a receber
          </p>
          <p className="text-sm font-bold mt-1 tabular-nums text-gold-300">
            {formatBRL(totals.balance)}
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={!valid}>
          Salvar
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
