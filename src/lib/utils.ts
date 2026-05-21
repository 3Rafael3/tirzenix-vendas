import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

export const PCT = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 4,
});

export const NUM = new Intl.NumberFormat("pt-BR");

export function formatBRL(value: number | undefined | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return BRL.format(value);
}

export function formatPct(value: number | undefined | null) {
  if (value == null || Number.isNaN(value) || !isFinite(value)) return "—";
  return PCT.format(value);
}

export function formatNum(value: number | undefined | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return NUM.format(value);
}

export function formatDate(value: string | undefined | null) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7); // yyyy-mm
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function daysUntil(isoDate: string | undefined | null): number | null {
  if (!isoDate) return null;
  const target = new Date(isoDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - now.getTime()) / 86400000);
  return diff;
}

export function deliveryUrgency(
  isoDate: string | undefined | null
): "overdue" | "soon" | "ok" | null {
  const d = daysUntil(isoDate);
  if (d == null) return null;
  if (d < 0) return "overdue";
  if (d <= 3) return "soon";
  return "ok";
}

/**
 * Aplica máscara (00) 00000-0000 (celular 11 dígitos) ou (00) 0000-0000 (fixo 10).
 * Aceita string parcial — o input pode estar incompleto durante digitação.
 */
export function formatPhone(value: string): string {
  const d = (value || "").replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Retorna apenas os dígitos do telefone (para comparação/normalização). */
export function phoneDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

/** Telefone está completo? (10 ou 11 dígitos) */
export function isPhoneComplete(value: string): boolean {
  const d = phoneDigits(value);
  return d.length === 10 || d.length === 11;
}

export function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  const names = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return `${names[(m || 1) - 1]}/${String(y).slice(2)}`;
}
