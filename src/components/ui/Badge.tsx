import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  // Vendas
  Pago: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30",
  Pendente: "bg-gold-500/10 text-gold-300 ring-1 ring-gold-500/40",
  Parcelado: "bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/30",
  Cancelado: "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30",
  Aguardando: "bg-silver-500/10 text-silver-300 ring-1 ring-silver-500/30",
  // Reservas
  Reservado: "bg-gold-500/15 text-gold-200 ring-1 ring-gold-500/40",
  "A Reservar": "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30",
  Entregue: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30",
  default: "bg-ink-700 text-silver-200 ring-1 ring-ink-600",
};

export function StatusBadge({ value }: { value: string }) {
  const cls = variants[value] || variants.default;
  return <span className={cn("badge", cls)}>{value}</span>;
}
