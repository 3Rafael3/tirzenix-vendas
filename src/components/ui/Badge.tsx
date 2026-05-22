import { cn } from "@/lib/utils";

/**
 * Status badges com paleta sóbria — tons -200/-300 sobre fundo /10 com ring /25.
 * Reservamos cores vivas (-300/-400) para valores monetários relevantes,
 * status fica em "voz baixa" para não competir com a informação principal.
 */
const variants: Record<string, string> = {
  // Vendas
  Pago: "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/25",
  Pendente: "bg-gold-500/10 text-gold-200 ring-1 ring-gold-500/30",
  Parcelado: "bg-sky-500/10 text-sky-200 ring-1 ring-sky-500/25",
  Cancelado: "bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/25",
  Aguardando: "bg-silver-500/10 text-silver-200 ring-1 ring-silver-500/25",
  // Reservas
  Reservado: "bg-gold-500/10 text-gold-200 ring-1 ring-gold-500/30",
  "A Reservar": "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/25",
  Entregue: "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/25",
  default: "bg-ink-800/60 text-silver-200 ring-1 ring-ink-600",
};

export function StatusBadge({ value, size = "sm" }: { value: string; size?: "sm" | "xs" }) {
  const cls = variants[value] || variants.default;
  return (
    <span
      className={cn(
        "badge",
        size === "xs" && "text-[10px] px-1.5 py-px",
        cls
      )}
    >
      {value}
    </span>
  );
}
