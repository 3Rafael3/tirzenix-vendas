import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Reservation,
  Sale,
  Settings,
  Product,
  StockMovement,
  Client,
} from "@/lib/types";
import {
  defaultSettings,
  seedClients,
  seedMovements,
  seedProducts,
  seedReservations,
  seedSales,
} from "@/lib/seed";
import { todayISO, uid, setPctPrecision } from "@/lib/utils";
import {
  packageUnitsFor,
  priceForVariant,
  purchasePriceForVariant,
  normalizeSettingsProductVariants,
  variantsForProduct,
} from "@/lib/productVariants";

interface StoreState {
  sales: Sale[];
  reservations: Reservation[];
  products: Product[];
  movements: StockMovement[];
  clients: Client[];
  settings: Settings;

  // ── Vendas
  addSale: (sale: Omit<Sale, "id">) => void;
  updateSale: (id: string, patch: Partial<Sale>) => void;
  deleteSale: (id: string) => void;

  // ── Reservas
  addReservation: (r: Omit<Reservation, "id">) => void;
  updateReservation: (id: string, patch: Partial<Reservation>) => void;
  deleteReservation: (id: string) => void;
  convertReservationToSale: (id: string) => void;

  // ── Produtos
  addProduct: (p: Omit<Product, "id" | "createdAt">) => string;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // ── Clientes
  addClient: (c: Omit<Client, "id" | "createdAt">) => string;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  /** Encontra ou cria um cliente pelo nome (case-insensitive) e devolve seus dados normalizados. */
  upsertClientByName: (name: string, phone: string) => Client | null;

  // ── Movimentações de estoque
  addStockEntry: (productId: string, qty: number, unitCost: number, date?: string, reason?: string) => void;
  addStockExit: (productId: string, qty: number, date?: string, reason?: string, refSaleId?: string) => void;
  addStockAdjustment: (productId: string, qty: number, reason?: string) => void;

  // ── Settings
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
  wipeData: () => void;

  exportJSON: () => string;
  importJSON: (raw: string) => { ok: boolean; error?: string };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      sales: seedSales,
      reservations: seedReservations,
      products: seedProducts,
      movements: seedMovements,
      clients: seedClients,
      settings: defaultSettings,

      // ──────────────────── VENDAS ────────────────────
      addSale: (sale) => {
        const id = uid();
        const newSale: Sale = { ...sale, id };
        set((s) => ({ sales: [newSale, ...s.sales] }));
        // Se vincular produto, gera saída automática de estoque
        if (sale.productId) {
          get().addStockExit(
            sale.productId,
            sale.qty * Math.max(1, sale.productVariantUnits || 1),
            sale.date,
            `Venda · ${sale.client}${sale.productVariant ? ` · ${sale.productVariant}` : ""}`,
            id
          );
        }
      },
      updateSale: (id, patch) => {
        const previous = get().sales.find((x) => x.id === id);
        if (!previous) return;
        const next: Sale = { ...previous, ...patch };

        set((s) => {
          let products = s.products;
          let movements = s.movements;
          const existingExit = movements.find(
            (m) => m.refSaleId === id && m.type === "exit"
          );

          if (existingExit) {
            products = products.map((p) =>
              p.id === existingExit.productId
                ? { ...p, stockQty: p.stockQty + existingExit.qty }
                : p
            );
            movements = movements.filter((m) => m.id !== existingExit.id);
          }

          if (next.productId) {
            const stockQty = next.qty * Math.max(1, next.productVariantUnits || 1);
            products = products.map((p) =>
              p.id === next.productId ? { ...p, stockQty: p.stockQty - stockQty } : p
            );
            movements = [
              {
                id: uid(),
                productId: next.productId,
                type: "exit",
                qty: stockQty,
                date: next.date,
                reason: `Venda · ${next.client}${next.productVariant ? ` · ${next.productVariant}` : ""}`,
                refSaleId: id,
              },
              ...movements,
            ];
          }

          return {
            sales: s.sales.map((x) => (x.id === id ? next : x)),
            products,
            movements,
          };
        });
      },
      deleteSale: (id) => {
        // Reverte movimentação de estoque vinculada (se houver)
        const sale = get().sales.find((x) => x.id === id);
        if (sale?.productId) {
          // Remove movimento e devolve ao estoque
          const mov = get().movements.find(
            (m) => m.refSaleId === id && m.type === "exit"
          );
          if (mov) {
            set((s) => ({
              movements: s.movements.filter((m) => m.id !== mov.id),
              products: s.products.map((p) =>
                p.id === sale.productId ? { ...p, stockQty: p.stockQty + mov.qty } : p
              ),
            }));
          }
        }
        set((s) => ({ sales: s.sales.filter((x) => x.id !== id) }));
      },

      // ──────────────────── RESERVAS ────────────────────
      addReservation: (r) =>
        set((s) => ({ reservations: [{ ...r, id: uid() }, ...s.reservations] })),
      updateReservation: (id, patch) =>
        set((s) => ({
          reservations: s.reservations.map((x) =>
            x.id === id ? { ...x, ...patch } : x
          ),
        })),
      deleteReservation: (id) =>
        set((s) => ({ reservations: s.reservations.filter((x) => x.id !== id) })),

      convertReservationToSale: (id) => {
        const res = get().reservations.find((x) => x.id === id);
        if (!res) return;
        // Tenta resolver preço de compra via produto vinculado
        let purchase = 0;
        if (res.productId) {
          const prod = get().products.find((p) => p.id === res.productId);
          if (prod) {
            const variant = variantsForProduct(get().settings, prod.name, prod).find(
              (v) =>
                v.label === res.productVariant ||
                v.units === res.productVariantUnits
            );
            purchase = variant
              ? purchasePriceForVariant(prod, variant)
              : priceForVariant(
                  prod.purchasePrice,
                  res.productVariantUnits || packageUnitsFor(prod),
                  packageUnitsFor(prod)
                );
          }
        }
        get().addSale({
          date: todayISO(),
          product: res.product,
          dosage: res.dosage,
          client: res.client,
          contact: res.contact,
          qty: res.qty,
          purchasePrice: purchase,
          salePrice: res.estimatedPrice,
          payment: res.payment,
          status: res.signalPaid >= res.estimatedPrice * res.qty ? "Pago" : "Parcelado",
          notes: `Convertido da reserva (sinal: ${res.signalPaid})`,
          productId: res.productId,
          productVariant: res.productVariant,
          productVariantUnits: res.productVariantUnits,
          signal:
            res.signalPaid > 0
              ? {
                  amount: res.signalPaid,
                  method: res.signalMethod || "Pix",
                  date: res.date,
                }
              : undefined,
        });
        set((s) => ({
          reservations: s.reservations.map((x) =>
            x.id === id ? { ...x, status: "Entregue" } : x
          ),
        }));
      },

      // ──────────────────── PRODUTOS ────────────────────
      addProduct: (p) => {
        const id = uid();
        const product: Product = {
          ...p,
          id,
          createdAt: todayISO(),
        };
        set((s) => ({ products: [product, ...s.products] }));
        // Se estoque inicial > 0, registra como entrada
        if (p.stockQty > 0) {
          set((s) => ({
            movements: [
              {
                id: uid(),
                productId: id,
                type: "entry",
                qty: p.stockQty,
                unitCost: p.purchasePrice,
                date: todayISO(),
                reason: "Estoque inicial",
              },
              ...s.movements,
            ],
          }));
        }
        return id;
      },
      updateProduct: (id, patch) =>
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      deleteProduct: (id) =>
        set((s) => ({
          products: s.products.filter((p) => p.id !== id),
          movements: s.movements.filter((m) => m.productId !== id),
        })),

      // ──────────────────── CLIENTES ────────────────────
      addClient: (c) => {
        const id = uid();
        const client: Client = { ...c, id, createdAt: todayISO() };
        set((s) => ({ clients: [client, ...s.clients] }));
        return id;
      },
      updateClient: (id, patch) =>
        set((s) => ({
          clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      deleteClient: (id) =>
        set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),
      upsertClientByName: (name, phone) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const lower = trimmed.toLowerCase();
        const existing = get().clients.find(
          (c) => c.name.toLowerCase() === lower
        );
        if (existing) {
          // Atualiza telefone se mudou
          if (phone && phone !== existing.phone) {
            set((s) => ({
              clients: s.clients.map((c) =>
                c.id === existing.id ? { ...c, phone } : c
              ),
            }));
            return { ...existing, phone };
          }
          return existing;
        }
        // Cria novo
        const id = uid();
        const client: Client = {
          id,
          name: trimmed,
          phone,
          createdAt: todayISO(),
        };
        set((s) => ({ clients: [client, ...s.clients] }));
        return client;
      },

      // ──────────────────── ESTOQUE ────────────────────
      addStockEntry: (productId, qty, unitCost, date, reason) => {
        if (qty <= 0) return;
        set((s) => ({
          movements: [
            {
              id: uid(),
              productId,
              type: "entry",
              qty,
              unitCost,
              date: date || todayISO(),
              reason,
            },
            ...s.movements,
          ],
          products: s.products.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  stockQty: p.stockQty + qty,
                  // Atualiza preço de compra para a entrada mais recente
                  purchasePrice: unitCost > 0 ? unitCost : p.purchasePrice,
                }
              : p
          ),
        }));
      },
      addStockExit: (productId, qty, date, reason, refSaleId) => {
        if (qty <= 0) return;
        set((s) => ({
          movements: [
            {
              id: uid(),
              productId,
              type: "exit",
              qty,
              date: date || todayISO(),
              reason,
              refSaleId,
            },
            ...s.movements,
          ],
          products: s.products.map((p) =>
            p.id === productId ? { ...p, stockQty: p.stockQty - qty } : p
          ),
        }));
      },
      addStockAdjustment: (productId, qty, reason) => {
        // qty pode ser positivo ou negativo (delta)
        set((s) => ({
          movements: [
            {
              id: uid(),
              productId,
              type: "adjustment",
              qty: Math.abs(qty),
              date: todayISO(),
              reason: `${qty >= 0 ? "+" : "-"}${Math.abs(qty)} · ${reason || "ajuste"}`,
            },
            ...s.movements,
          ],
          products: s.products.map((p) =>
            p.id === productId ? { ...p, stockQty: p.stockQty + qty } : p
          ),
        }));
      },

      // ──────────────────── SETTINGS ────────────────────
      updateSettings: (patch) =>
        set((s) => {
          const next = normalizeSettingsProductVariants({ ...s.settings, ...patch });
          // Propaga precisão de percentuais
          setPctPrecision(next.showFullPrecisionPct ? 4 : 2);
          return { settings: next };
        }),

      resetAll: () =>
        set({
          sales: [],
          reservations: [],
          products: [],
          movements: [],
          clients: [],
          settings: defaultSettings,
        }),
      wipeData: () =>
        set((s) => ({
          sales: [],
          reservations: [],
          products: [],
          movements: [],
          clients: [],
          settings: s.settings,
        })),

      exportJSON: () => {
        const { sales, reservations, products, movements, clients, settings } = get();
        return JSON.stringify(
          {
            tirzenixBackup: true,
            exportedAt: new Date().toISOString(),
            app: "tirzenix-vendas",
            version: 5,
            data: { sales, reservations, products, movements, clients, settings },
          },
          null,
          2
        );
      },

      importJSON: (raw) => {
        try {
          const parsed = JSON.parse(raw);
          const data =
            parsed?.data && typeof parsed.data === "object"
              ? parsed.data
              : parsed?.backup && typeof parsed.backup === "object"
              ? parsed.backup
              : parsed?.state?.data && typeof parsed.state.data === "object"
              ? parsed.state.data
              : parsed?.state?.backup && typeof parsed.state.backup === "object"
              ? parsed.state.backup
              : parsed?.state && typeof parsed.state === "object"
              ? parsed.state
              : parsed;
          if (!data || typeof data !== "object") throw new Error("JSON inválido");
          const importedSettings = normalizeSettingsProductVariants({
            ...defaultSettings,
            ...(data.settings || {}),
            productVariants: {
              ...(defaultSettings.productVariants || {}),
              ...(data.settings?.productVariants || {}),
            },
          });
          set({
            sales: Array.isArray(data.sales) ? data.sales : [],
            reservations: Array.isArray(data.reservations) ? data.reservations : [],
            products: Array.isArray(data.products) ? data.products : [],
            movements: Array.isArray(data.movements) ? data.movements : [],
            clients: Array.isArray(data.clients) ? data.clients : [],
            settings: importedSettings,
          });
          return { ok: true };
        } catch (e: any) {
          return { ok: false, error: e?.message || "Erro ao importar" };
        }
      },
    }),
    {
      name: "tirzenix-vendas",
      version: 5,
      migrate: (persisted: any, version) => {
        // v1/v2 → v3: zera tudo
        if (version < 3) {
          return {
            sales: [],
            reservations: [],
            products: [],
            movements: [],
            clients: [],
            settings: defaultSettings,
          };
        }
        // v3 → v4: garante array `clients`
        if (version < 4) {
          return {
            ...(persisted || {}),
            clients: Array.isArray(persisted?.clients) ? persisted.clients : [],
          };
        }
        if (version < 5) {
          return {
            ...(persisted || {}),
            settings: normalizeSettingsProductVariants({
              ...defaultSettings,
              ...(persisted?.settings || {}),
              productVariants: {
                ...(defaultSettings.productVariants || {}),
                ...(persisted?.settings?.productVariants || {}),
              },
            }),
          };
        }
        return persisted;
      },
      onRehydrateStorage: () => (state) => {
        // Aplica a precisão de percentuais persistida assim que o store reidrata
        setPctPrecision(state?.settings?.showFullPrecisionPct ? 4 : 2);
      },
    }
  )
);

// ─── Selectors derivados úteis ──────────────────────────────
export function getSaleTotals(sale: Sale) {
  const totalPurchase = sale.qty * sale.purchasePrice;
  const totalSale = sale.qty * sale.salePrice;
  const profit = totalSale - totalPurchase;
  const margin = totalSale ? profit / totalSale : 0;
  return { totalPurchase, totalSale, profit, margin };
}

/**
 * Cálculo financeiro completo de uma venda:
 * sinal, parcelas, taxa de cartão, taxa de parcelamento, valor líquido, lucro líquido.
 */
export interface SaleFinancials {
  totalPurchase: number;
  totalSale: number;       // bruto
  grossProfit: number;
  grossMargin: number;

  signalAmount: number;
  signalMethod: string;
  remainingAmount: number;
  remainingMethod: string;

  installments: number;
  installmentValue: number;

  cardBase: number;        // valor sobre o qual incidem taxas de cartão
  cardFee: number;
  installmentFee: number;
  otherFees: number;
  totalFees: number;
  effectiveFeePct: number;

  netReceived: number;     // líquido após taxas
  netProfit: number;
  netMargin: number;
}

export function getSaleFinancials(sale: Sale): SaleFinancials {
  const qty = Number(sale?.qty) || 0;
  const purchasePrice = Number(sale?.purchasePrice) || 0;
  const salePrice = Number(sale?.salePrice) || 0;
  const totalPurchase = qty * purchasePrice;
  const totalSale = qty * salePrice;
  const grossProfit = totalSale - totalPurchase;
  const grossMargin = totalSale ? grossProfit / totalSale : 0;

  const signalAmount = Math.min(Number(sale?.signal?.amount) || 0, totalSale);
  const signalMethod = sale?.signal?.method || "";
  const remainingAmount = Math.max(totalSale - signalAmount, 0);
  const remainingMethod = sale?.payment || "";

  // Taxas incidem só sobre a parte paga no cartão (saldo restante após o sinal)
  const onCard = sale?.payment === "Cartão Crédito";
  const cardBase = onCard ? remainingAmount : 0;

  const cardFeePct = Number(sale?.cardFeePct) || 0;
  const installmentFeePct = Number(sale?.installmentFeePct) || 0;
  const installments = Math.max(Number(sale?.installments) || 1, 1);

  const cardFee = onCard ? cardBase * (cardFeePct / 100) : 0;
  const installmentFee =
    onCard && installments > 1
      ? cardBase * ((installmentFeePct * (installments - 1)) / 100)
      : 0;
  const otherFees = Number(sale?.otherFees) || 0;
  const totalFees = cardFee + installmentFee + otherFees;
  const effectiveFeePct = cardBase ? (cardFee + installmentFee) / cardBase : 0;

  const installmentValue = installments > 0 ? (cardBase + cardFee + installmentFee) / installments : 0;

  const netReceived = totalSale - totalFees;
  const netProfit = netReceived - totalPurchase;
  const netMargin = netReceived ? netProfit / netReceived : 0;

  return {
    totalPurchase,
    totalSale,
    grossProfit,
    grossMargin,
    signalAmount,
    signalMethod,
    remainingAmount,
    remainingMethod,
    installments,
    installmentValue,
    cardBase,
    cardFee,
    installmentFee,
    otherFees,
    totalFees,
    effectiveFeePct,
    netReceived,
    netProfit,
    netMargin,
  };
}

export function getReservationTotals(r: Reservation) {
  const total = r.qty * r.estimatedPrice;
  const balance = total - (r.signalPaid || 0);
  return { total, balance };
}

export function getProductMetrics(p: Product) {
  const unitsPerBox = packageUnitsFor(p);
  const purchasePerUnit = p.purchasePrice / unitsPerBox;
  const salePerUnit = p.salePrice / unitsPerBox;
  const stockValue = p.stockQty * purchasePerUnit;
  const potentialRevenue = p.stockQty * salePerUnit;
  const potentialProfit = potentialRevenue - stockValue;
  const margin = p.salePrice ? (p.salePrice - p.purchasePrice) / p.salePrice : 0;
  const markup = p.purchasePrice ? (p.salePrice - p.purchasePrice) / p.purchasePrice : 0;
  const lowStock = p.stockQty <= p.minStock;
  return {
    stockValue,
    potentialRevenue,
    potentialProfit,
    margin,
    markup,
    lowStock,
    outOfStock: p.stockQty <= 0,
  };
}
