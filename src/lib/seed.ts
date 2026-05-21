import type { Sale, Reservation, Settings, Product, StockMovement, Client } from "./types";
import { defaultAmpouleVariants, gluconexVariants } from "./productVariants";

/**
 * Sistema iniciado SEM dados — pronto para o usuário preencher.
 * Apenas as configurações padrão são mantidas.
 */
export const defaultSettings: Settings = {
  paymentMethods: ["Pix", "Dinheiro", "Cartão Crédito"],
  saleStatuses: ["Pago", "Pendente", "Parcelado", "Cancelado", "Aguardando"],
  reservationStatuses: ["A Reservar", "Reservado", "Entregue", "Cancelado"],
  dosages: ["2.5mg", "5mg", "7.5mg", "10mg", "12.5mg", "15mg"],
  products: ["T.G.", "Tirzec", "Lipoless", "Gluconex"],
  productVariants: {
    "T.G.": defaultAmpouleVariants,
    Tirzec: defaultAmpouleVariants,
    Lipoless: defaultAmpouleVariants,
    Gluconex: gluconexVariants,
  },
  monthlyGoal: 20000,
  brand: {
    name: "Tirzenix",
    tagline: "Sua melhor versão, nossa missão.",
    logoScale: 1,
  },
  feeDefaults: {
    cardFeePct: 3.5,
    installmentFeePct: 1.0,
  },
};

export const seedSales: Sale[] = [];
export const seedReservations: Reservation[] = [];
export const seedProducts: Product[] = [];
export const seedMovements: StockMovement[] = [];
export const seedClients: Client[] = [];
