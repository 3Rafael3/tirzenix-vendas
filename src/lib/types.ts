export type PaymentMethod = string;
export type SaleStatus = string;
export type ReservationStatus = string;

export interface SignalPayment {
  amount: number;
  method: PaymentMethod;
  date?: string;
}

export interface Sale {
  id: string;
  date: string; // ISO yyyy-mm-dd
  product: string;
  dosage: string;
  client: string;
  contact: string;
  qty: number;
  purchasePrice: number;
  salePrice: number;
  /** Método do pagamento principal (do saldo restante após o sinal). */
  payment: PaymentMethod;
  status: SaleStatus;
  notes?: string;
  productId?: string;
  /** Subitem/variação escolhida, ex: 1 ampola, 1 seringa, 4 unidades (caixa fechada). */
  productVariant?: string;
  /** Quantas ampolas/seringas/unidades de estoque este subitem consome por item vendido. */
  productVariantUnits?: number;

  /** Sinal pago (entrada). Opcional. */
  signal?: SignalPayment;
  /** Parcelas do cartão de crédito (1 = à vista). */
  installments?: number;
  /** Taxa base do cartão (%). */
  cardFeePct?: number;
  /** Taxa adicional por parcela acima da 1ª (%). */
  installmentFeePct?: number;
  /** Outras taxas em valor absoluto (R$). */
  otherFees?: number;
}

export interface Reservation {
  id: string;
  date: string;
  client: string;
  contact: string;
  product: string;
  dosage: string;
  qty: number;
  estimatedPrice: number;
  signalPaid: number;
  /** Método como o sinal foi pago (Pix, Dinheiro, etc.) */
  signalMethod?: PaymentMethod;
  deliveryDate?: string;
  payment: PaymentMethod;
  status: ReservationStatus;
  notes?: string;
  productId?: string;
  productVariant?: string;
  productVariantUnits?: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string; // formato (00) 00000-0000
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  dosage: string;
  sku?: string;
  purchasePrice: number;
  salePrice: number;
  /** Quantidade de ampolas/seringas/unidades que compõem a caixa fechada. Padrão: 4. */
  packageUnits?: number;
  variants?: ProductVariant[];
  stockQty: number;
  minStock: number;
  supplier?: string;
  notes?: string;
  createdAt: string;
}

export type MovementType = "entry" | "exit" | "adjustment";

export interface StockMovement {
  id: string;
  productId: string;
  type: MovementType;
  qty: number;
  unitCost?: number;
  date: string;
  reason?: string;
  refSaleId?: string;
}

export interface FeeDefaults {
  /** Taxa base do cartão (%) aplicada à vista. Ex: 3.5 */
  cardFeePct: number;
  /** Taxa adicional (%) por parcela acima da 1ª. Ex: 1.0 */
  installmentFeePct: number;
}

export interface ProductVariant {
  id: string;
  label: string;
  units: number;
  purchasePrice?: number;
  salePrice?: number;
  closedBox?: boolean;
}

export interface Settings {
  paymentMethods: string[];
  saleStatuses: string[];
  reservationStatuses: string[];
  dosages: string[];
  products: string[];
  productVariants?: Record<string, ProductVariant[]>;
  monthlyGoal: number;
  brand: {
    name: string;
    tagline: string;
    logo?: string;
    logoScale?: number;
  };
  /** Taxas padrão aplicadas automaticamente em novas vendas. */
  feeDefaults?: FeeDefaults;
}
