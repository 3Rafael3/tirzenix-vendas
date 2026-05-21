import { useState } from "react";
import { useStore } from "@/store/useStore";
import { todayISO } from "@/lib/utils";
import { packageUnitsFor, stockUnitPlural, stockUnitSingular, stockUnitText } from "@/lib/productVariants";
import { CurrencyInput, NumberInput } from "@/components/forms/CurrencyInput";

interface Props {
  type: "entry" | "exit" | "adjustment";
  onDone: () => void;
  onCancel: () => void;
}

export function MovementForm({ type, onDone, onCancel }: Props) {
  const products = useStore((s) => s.products);
  const addStockEntry = useStore((s) => s.addStockEntry);
  const addStockExit = useStore((s) => s.addStockExit);
  const addStockAdjustment = useStore((s) => s.addStockAdjustment);

  const [productId, setProductId] = useState(products[0]?.id || "");
  const [unitMode, setUnitMode] = useState<"ampoule" | "box">("ampoule");
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(
    products[0] ? products[0].purchasePrice / packageUnitsFor(products[0]) : 0
  );
  const [date, setDate] = useState(todayISO());
  const [reason, setReason] = useState("");
  const [direction, setDirection] = useState<"+" | "-">("+");
  const [confirmNegativeStock, setConfirmNegativeStock] = useState(false);

  const product = products.find((p) => p.id === productId);
  const packageUnits = packageUnitsFor(product);
  const unitSingular = product ? stockUnitSingular(product.name) : "ampola";
  const unitPlural = product ? stockUnitPlural(product.name) : "ampolas";
  const stockDelta = qty * (unitMode === "box" ? packageUnits : 1);
  const stockAfter =
    type === "entry"
      ? (product?.stockQty || 0) + stockDelta
      : type === "exit"
      ? (product?.stockQty || 0) - stockDelta
      : (product?.stockQty || 0) + (direction === "+" ? stockDelta : -stockDelta);
  const willNegativeStock = !!product && stockAfter < 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || qty <= 0) return;
    if (willNegativeStock && !confirmNegativeStock) {
      setConfirmNegativeStock(true);
      return;
    }
    if (type === "entry") {
      const packageCost = unitMode === "box" ? unitCost : unitCost * packageUnits;
      addStockEntry(productId, stockDelta, packageCost, date, reason || "Entrada de estoque");
    } else if (type === "exit") {
      addStockExit(productId, stockDelta, date, reason || "Saída manual");
    } else {
      const signed = direction === "+" ? stockDelta : -stockDelta;
      addStockAdjustment(productId, signed, reason || "Ajuste");
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="label">Produto</span>
        <select
          className="input"
          value={productId}
          onChange={(e) => {
            const v = e.target.value;
            setProductId(v);
            const p = products.find((x) => x.id === v);
            if (p) setUnitCost(unitMode === "box" ? p.purchasePrice : p.purchasePrice / packageUnitsFor(p));
            setConfirmNegativeStock(false);
          }}
          required
        >
          <option value="">Selecione…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.dosage} (estoque: {p.stockQty})
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="label">Registrar por</span>
          <select
            className="input"
            value={unitMode}
            onChange={(e) => {
              const mode = e.target.value as "ampoule" | "box";
              setUnitMode(mode);
              if (product) {
                setUnitCost(mode === "box" ? product.purchasePrice : product.purchasePrice / packageUnitsFor(product));
              }
              setConfirmNegativeStock(false);
            }}
          >
            <option value="ampoule">{unitSingular[0].toUpperCase()}{unitSingular.slice(1)}</option>
            <option value="box">Caixa fechada</option>
          </select>
        </label>
        {type === "adjustment" && (
          <label className="block">
            <span className="label">Direção</span>
            <select
              className="input"
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value as "+" | "-");
                setConfirmNegativeStock(false);
              }}
            >
              <option value="+">+ Adicionar</option>
              <option value="-">− Remover</option>
            </select>
          </label>
        )}
        <label className="block">
          <span className="label">
            Quantidade ({unitMode === "box" ? "caixas" : unitPlural})
          </span>
          <NumberInput
            min={1}
            value={qty}
            onChange={(n) => {
              setQty(Math.max(1, n));
              setConfirmNegativeStock(false);
            }}
          />
        </label>
        {type === "entry" && (
          <label className="block">
            <span className="label">
              Preço de compra ({unitMode === "box" ? "caixa" : unitSingular})
            </span>
            <CurrencyInput
              value={unitCost}
              onChange={(n) => setUnitCost(n)}
              required
            />
          </label>
        )}
        {type !== "entry" && type !== "adjustment" && null}
      </div>

      {type !== "adjustment" && (
        <label className="block">
          <span className="label">Data</span>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      )}

      <label className="block">
        <span className="label">Motivo / observação</span>
        <input
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            type === "entry"
              ? "Compra de fornecedor X…"
              : type === "exit"
              ? "Saída manual, doação, perda…"
              : "Acerto de inventário"
          }
        />
      </label>

      {product && (
        <div className="rounded-xl bg-ink-950/60 border border-gold-800/30 px-4 py-3 text-sm text-silver-200">
          <p>
            Estoque atual: <strong className="text-gold-300">{stockUnitText(product.name, product.stockQty)}</strong>.
          </p>
          {unitMode === "box" && (
            <p className="text-xs text-silver-400 mt-1">
              {qty} caixa(s) = {stockUnitText(product.name, stockDelta)}.
            </p>
          )}
          {type === "entry" && (
            <p className="text-xs text-silver-400 mt-1">
              Após esta entrada: {stockUnitText(product.name, stockAfter)}.
            </p>
          )}
          {type === "exit" && (
            <p className="text-xs text-silver-400 mt-1">
              Após esta saída: {stockUnitText(product.name, stockAfter)}.
            </p>
          )}
          {type === "adjustment" && (
            <p className="text-xs text-silver-400 mt-1">
              Após ajuste: {stockUnitText(product.name, stockAfter)}.
            </p>
          )}
          {willNegativeStock && (
            <p className="text-xs text-rose-300 mt-2">
              O estoque ficará negativo. Clique em registrar novamente para confirmar.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={!productId || qty <= 0}>
          Registrar
        </button>
      </div>
    </form>
  );
}
