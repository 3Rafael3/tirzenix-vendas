import { motion } from "framer-motion";
import {
  Receipt,
  User,
  Calendar,
  Package,
  CreditCard,
  Wallet,
  TrendingUp,
  StickyNote,
} from "lucide-react";
import type { Sale } from "@/lib/types";
import { getSaleFinancials } from "@/store/useStore";
import { formatBRL, formatDate, formatPct } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { stockUnitText } from "@/lib/productVariants";

interface Props {
  sale: Sale;
}

/**
 * Visão estilo "comprovante" detalhado de uma venda.
 * Renderizado dentro de um <Modal> da página Vendas.
 */
export function SaleDetail({ sale }: Props) {
  const fin = getSaleFinancials(sale);

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 pb-4 border-b border-gold-900/25"
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold-400 font-semibold">
            Comprovante de venda
          </p>
          <p className="font-display text-2xl font-bold text-silver-50 tracking-tight-display mt-1">
            {formatBRL(fin.totalSale)}
          </p>
          <p className="text-xs text-silver-400 mt-0.5 font-mono">
            #{sale.id.slice(-8).toUpperCase()}
          </p>
        </div>
        <StatusBadge value={sale.status} />
      </motion.div>

      {/* Identificação */}
      <Block icon={Calendar} title="Identificação">
        <Row label="Data" value={formatDate(sale.date)} />
        <Row
          label="Cliente"
          value={
            <span>
              <strong className="text-silver-50">{sale.client}</strong>
              {sale.contact && (
                <span className="text-silver-500 ml-2">· {sale.contact}</span>
              )}
            </span>
          }
        />
      </Block>

      {/* Produto */}
      <Block icon={Package} title="Produto">
        <Row label="Item" value={`${sale.product} · ${sale.dosage}`} />
        {sale.productVariant && <Row label="Subitem" value={sale.productVariant} />}
        <Row label="Quantidade" value={String(sale.qty)} />
        {sale.productVariantUnits && (
          <Row
            label="Estoque consumido"
            value={stockUnitText(sale.product, sale.qty * sale.productVariantUnits, sale.productVariant)}
          />
        )}
        <Row label="Preço do subitem (compra)" value={formatBRL(sale.purchasePrice)} mono />
        <Row label="Preço do subitem (venda)" value={formatBRL(sale.salePrice)} mono />
      </Block>

      {/* Sinal */}
      {fin.signalAmount > 0 && (
        <Block icon={Wallet} title="Sinal / entrada">
          <Row
            label={`Pago em ${formatDate(sale.signal?.date) || "—"}`}
            value={
              <span>
                <strong className="text-gold-200">{formatBRL(fin.signalAmount)}</strong>
                <span className="ml-2 text-silver-500">via {fin.signalMethod || "—"}</span>
              </span>
            }
          />
        </Block>
      )}

      {/* Pagamento */}
      <Block icon={CreditCard} title="Pagamento do saldo">
        <Row label="Método" value={sale.payment} />
        {fin.signalAmount > 0 && (
          <Row label="Saldo após sinal" value={formatBRL(fin.remainingAmount)} mono />
        )}
        {sale.payment === "Cartão Crédito" && (
          <>
            <Row
              label={`${fin.installments}× ${fin.installments === 1 ? "(à vista)" : ""}`}
              value={`${fin.installments}× ${formatBRL(fin.installmentValue)}`}
              mono
            />
            {fin.cardFee > 0 && (
              <Row label={`Taxa cartão (${formatPct((sale.cardFeePct ?? 0) / 100)})`} value={`− ${formatBRL(fin.cardFee)}`} mono tone="rose" />
            )}
            {fin.installmentFee > 0 && (
              <Row
                label={`Taxa parcelamento (+${sale.installmentFeePct}% por parcela extra)`}
                value={`− ${formatBRL(fin.installmentFee)}`}
                mono
                tone="rose"
              />
            )}
          </>
        )}
        {fin.otherFees > 0 && (
          <Row label="Outras taxas" value={`− ${formatBRL(fin.otherFees)}`} mono tone="rose" />
        )}
      </Block>

      {/* Resultado */}
      <Block icon={TrendingUp} title="Resultado">
        <div className="rounded-2xl bg-gradient-to-br from-ink-950/80 to-gold-950/30 border border-gold-700/40 p-4 space-y-1.5">
          <Row label="Total bruto" value={formatBRL(fin.totalSale)} mono />
          {fin.totalFees > 0 && (
            <Row
              label="(−) Total de taxas"
              value={`− ${formatBRL(fin.totalFees)}`}
              mono
              tone="rose"
            />
          )}
          <div className="gold-divider my-2" />
          <Row
            label="VALOR LÍQUIDO RECEBIDO"
            value={formatBRL(fin.netReceived)}
            highlight
          />
          <Row label="(−) Custo do produto" value={`− ${formatBRL(fin.totalPurchase)}`} mono tone="silver" />
          <Row label="LUCRO LÍQUIDO" value={formatBRL(fin.netProfit)} highlight tone="emerald" />
          <Row label="Margem líquida" value={formatPct(fin.netMargin)} mono tone="gold" />
        </div>
      </Block>

      {sale.notes && (
        <Block icon={StickyNote} title="Observações">
          <p className="text-sm text-silver-300 whitespace-pre-wrap leading-relaxed">
            {sale.notes}
          </p>
        </Block>
      )}

      <div className="flex items-center justify-center gap-2 pt-2 text-[10px] uppercase tracking-[0.2em] text-gold-500/60">
        <Receipt size={11} />
        <span>Tirzenix · documento interno</span>
      </div>
    </div>
  );
}

function Block({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<any>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 text-gold-400 mb-2">
        <Icon size={13} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
          {title}
        </span>
        <span className="h-px flex-1 bg-gold-900/30 ml-1" />
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  highlight?: boolean;
  tone?: "rose" | "silver" | "emerald" | "gold";
}) {
  const valueTone =
    tone === "rose"
      ? "text-rose-300"
      : tone === "emerald"
      ? "text-emerald-300"
      : tone === "silver"
      ? "text-silver-300"
      : tone === "gold"
      ? "text-gold-300"
      : highlight
      ? "text-gold-200"
      : "text-silver-100";
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span
        className={cn(
          highlight
            ? "text-[10px] uppercase tracking-[0.18em] font-bold text-gold-400"
            : "text-xs text-silver-400"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          mono ? "font-mono tabular-nums" : "",
          highlight ? "text-lg font-bold" : "text-sm",
          valueTone,
          "text-right"
        )}
      >
        {value}
      </span>
    </div>
  );
}
