import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  LineChart,
  PackageSearch,
  ReceiptText,
  Settings2,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Empty } from "@/components/ui/Empty";
import { toast } from "@/components/ui/Toast";
import { useStore, getProductMetrics, getReservationTotals, getSaleFinancials } from "@/store/useStore";
import {
  formatBRL,
  formatDate,
  formatNum,
  formatPct,
  monthKey,
  todayISO,
} from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  exportExcelWorkbook,
  openPdfReport,
  type ReportCell,
  type ReportSheet,
  type ReportSummaryCard,
} from "@/lib/reporting";
import type { Client, Product, Reservation, Sale } from "@/lib/types";

type ReportKind = "executive" | "financial" | "sales" | "stock" | "reservations" | "clients";
type Period = "thisMonth" | "last30" | "thisYear" | "all" | "custom";
type Tone = "gold" | "silver" | "emerald" | "rose";

interface ColumnDef<T> {
  id: string;
  label: string;
  type?: "money" | "number" | "percent" | "date";
  value: (item: T) => ReportCell;
}

interface Preset {
  id: ReportKind;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
}

const presets: Preset[] = [
  {
    id: "executive",
    label: "Executivo",
    description: "Visão de gestão com KPIs, lucro, taxas e operação.",
    icon: Sparkles,
  },
  {
    id: "financial",
    label: "Financeiro",
    description: "Receita bruta, líquida, lucro, margem, sinal e taxas.",
    icon: WalletCards,
  },
  {
    id: "sales",
    label: "Vendas",
    description: "Tabela detalhada para auditoria comercial.",
    icon: ReceiptText,
  },
  {
    id: "stock",
    label: "Estoque",
    description: "Produtos, custos, margem, valor imobilizado e alertas.",
    icon: PackageSearch,
  },
  {
    id: "reservations",
    label: "Reservas",
    description: "Pedidos, sinais, saldos e previsão de entrega.",
    icon: CalendarDays,
  },
  {
    id: "clients",
    label: "Clientes",
    description: "Carteira de clientes com contato e histórico.",
    icon: LineChart,
  },
];

const periodLabels: Record<Period, string> = {
  thisMonth: "Este mês",
  last30: "Últimos 30 dias",
  thisYear: "Este ano",
  all: "Todo o período",
  custom: "Personalizado",
};

function localISO(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function startOfYear() {
  return `${new Date().getFullYear()}-01-01`;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localISO(d);
}

function rangeForPeriod(period: Period, customStart: string, customEnd: string) {
  if (period === "all") return { start: "", end: "" };
  if (period === "thisMonth") return { start: startOfMonth(), end: localISO() };
  if (period === "last30") return { start: daysAgo(30), end: localISO() };
  if (period === "thisYear") return { start: startOfYear(), end: localISO() };
  return { start: customStart, end: customEnd };
}

function inRange(date: string | undefined, start: string, end: string) {
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function fileSafe(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export default function Relatorios() {
  const sales = useStore((s) => s.sales);
  const reservations = useStore((s) => s.reservations);
  const products = useStore((s) => s.products);
  const clients = useStore((s) => s.clients);
  const settings = useStore((s) => s.settings);

  const [kind, setKind] = useState<ReportKind>("executive");
  const [period, setPeriod] = useState<Period>("thisMonth");
  const [customStart, setCustomStart] = useState(startOfMonth());
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const { start, end } = rangeForPeriod(period, customStart, customEnd);

  const productNames = useMemo(() => {
    return Array.from(
      new Set([
        ...products.map((p) => p.name),
        ...sales.map((s) => s.product),
        ...reservations.map((r) => r.product),
      ])
    ).sort((a, b) => a.localeCompare(b));
  }, [products, reservations, sales]);

  const saleStatuses = useMemo(
    () => Array.from(new Set([...settings.saleStatuses, ...sales.map((s) => s.status)])),
    [sales, settings.saleStatuses]
  );
  const reservationStatuses = useMemo(
    () =>
      Array.from(
        new Set([...settings.reservationStatuses, ...reservations.map((r) => r.status)])
      ),
    [reservations, settings.reservationStatuses]
  );

  const filteredSales = useMemo(() => {
    return sales
      .filter((sale) => {
        if (!inRange(sale.date, start, end)) return false;
        if (productFilter && sale.product !== productFilter) return false;
        if (statusFilter && sale.status !== statusFilter) return false;
        if (paymentFilter && sale.payment !== paymentFilter) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [end, paymentFilter, productFilter, sales, start, statusFilter]);

  const filteredReservations = useMemo(() => {
    return reservations
      .filter((reservation) => {
        if (!inRange(reservation.date, start, end)) return false;
        if (productFilter && reservation.product !== productFilter) return false;
        if (statusFilter && reservation.status !== statusFilter) return false;
        if (paymentFilter && reservation.payment !== paymentFilter) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [end, paymentFilter, productFilter, reservations, start, statusFilter]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => (productFilter ? product.name === productFilter : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [productFilter, products]);

  const filteredClients = useMemo(() => {
    return clients
      .filter((client) => (start || end ? inRange(client.createdAt, start, end) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, end, start]);

  const salesColumns = useMemo<ColumnDef<Sale>[]>(
    () => [
      { id: "date", label: "Data", type: "date", value: (s) => s.date },
      { id: "client", label: "Cliente", value: (s) => s.client },
      { id: "contact", label: "Contato", value: (s) => s.contact },
      { id: "product", label: "Produto", value: (s) => s.product },
      { id: "variant", label: "Subitem", value: (s) => s.productVariant || "" },
      { id: "dosage", label: "Dosagem", value: (s) => s.dosage },
      { id: "qty", label: "Unidades vendidas", type: "number", value: (s) => s.qty },
      {
        id: "ampoules",
        label: "Ampolas/seringas",
        type: "number",
        value: (s) => (s.productVariantUnits ? s.qty * s.productVariantUnits : s.qty),
      },
      {
        id: "closedBoxes",
        label: "Caixas fechadas",
        type: "number",
        value: (s) => ((s.productVariantUnits || 1) >= 4 ? s.qty : 0),
      },
      { id: "unitSale", label: "Venda un.", type: "money", value: (s) => s.salePrice },
      {
        id: "gross",
        label: "Total bruto",
        type: "money",
        value: (s) => getSaleFinancials(s).totalSale,
      },
      { id: "payment", label: "Pagamento", value: (s) => s.payment },
      { id: "status", label: "Status", value: (s) => s.status },
      { id: "notes", label: "Observações", value: (s) => s.notes || "" },
    ],
    []
  );

  const financialColumns = useMemo<ColumnDef<Sale>[]>(
    () => [
      { id: "date", label: "Data", type: "date", value: (s) => s.date },
      { id: "client", label: "Cliente", value: (s) => s.client },
      {
        id: "product",
        label: "Produto",
        value: (s) =>
          `${s.product} · ${s.dosage}${s.productVariant ? ` · ${s.productVariant}` : ""}`,
      },
      { id: "qty", label: "Unidades vendidas", type: "number", value: (s) => s.qty },
      {
        id: "ampoules",
        label: "Ampolas/seringas",
        type: "number",
        value: (s) => (s.productVariantUnits ? s.qty * s.productVariantUnits : s.qty),
      },
      {
        id: "closedBoxes",
        label: "Caixas fechadas",
        type: "number",
        value: (s) => ((s.productVariantUnits || 1) >= 4 ? s.qty : 0),
      },
      {
        id: "gross",
        label: "Bruto",
        type: "money",
        value: (s) => getSaleFinancials(s).totalSale,
      },
      {
        id: "signal",
        label: "Sinal",
        type: "money",
        value: (s) => getSaleFinancials(s).signalAmount,
      },
      { id: "payment", label: "Pagamento", value: (s) => s.payment },
      {
        id: "installments",
        label: "Parcelas",
        type: "number",
        value: (s) => getSaleFinancials(s).installments,
      },
      {
        id: "cardFee",
        label: "Taxa cartão",
        type: "money",
        value: (s) => getSaleFinancials(s).cardFee,
      },
      {
        id: "installmentFee",
        label: "Taxa parc.",
        type: "money",
        value: (s) => getSaleFinancials(s).installmentFee,
      },
      {
        id: "otherFees",
        label: "Outras taxas",
        type: "money",
        value: (s) => getSaleFinancials(s).otherFees,
      },
      {
        id: "totalFees",
        label: "Total taxas",
        type: "money",
        value: (s) => getSaleFinancials(s).totalFees,
      },
      {
        id: "net",
        label: "Líquido",
        type: "money",
        value: (s) => getSaleFinancials(s).netReceived,
      },
      {
        id: "cost",
        label: "Custo",
        type: "money",
        value: (s) => getSaleFinancials(s).totalPurchase,
      },
      {
        id: "profit",
        label: "Lucro",
        type: "money",
        value: (s) => getSaleFinancials(s).netProfit,
      },
      {
        id: "margin",
        label: "Margem",
        type: "percent",
        value: (s) => getSaleFinancials(s).netMargin,
      },
      { id: "status", label: "Status", value: (s) => s.status },
    ],
    []
  );

  const stockColumns = useMemo<ColumnDef<Product>[]>(
    () => [
      { id: "name", label: "Produto", value: (p) => p.name },
      { id: "dosage", label: "Dosagem", value: (p) => p.dosage },
      { id: "sku", label: "SKU", value: (p) => p.sku || "" },
      { id: "stock", label: "Estoque", type: "number", value: (p) => p.stockQty },
      { id: "minStock", label: "Mínimo", type: "number", value: (p) => p.minStock },
      { id: "packageUnits", label: "Unid./caixa", type: "number", value: (p) => p.packageUnits || 4 },
      { id: "purchase", label: "Compra caixa", type: "money", value: (p) => p.purchasePrice },
      { id: "sale", label: "Venda caixa", type: "money", value: (p) => p.salePrice },
      {
        id: "stockValue",
        label: "Valor em estoque",
        type: "money",
        value: (p) => getProductMetrics(p).stockValue,
      },
      {
        id: "potentialRevenue",
        label: "Receita potencial",
        type: "money",
        value: (p) => getProductMetrics(p).potentialRevenue,
      },
      {
        id: "potentialProfit",
        label: "Lucro potencial",
        type: "money",
        value: (p) => getProductMetrics(p).potentialProfit,
      },
      {
        id: "margin",
        label: "Margem",
        type: "percent",
        value: (p) => getProductMetrics(p).margin,
      },
      {
        id: "alert",
        label: "Status estoque",
        value: (p) =>
          getProductMetrics(p).outOfStock
            ? "Esgotado"
            : getProductMetrics(p).lowStock
            ? "Baixo"
            : "Saudável",
      },
      { id: "supplier", label: "Fornecedor", value: (p) => p.supplier || "" },
    ],
    []
  );

  const reservationColumns = useMemo<ColumnDef<Reservation>[]>(
    () => [
      { id: "date", label: "Data", type: "date", value: (r) => r.date },
      { id: "delivery", label: "Entrega", type: "date", value: (r) => r.deliveryDate || "" },
      { id: "client", label: "Cliente", value: (r) => r.client },
      { id: "contact", label: "Contato", value: (r) => r.contact },
      {
        id: "product",
        label: "Produto",
        value: (r) =>
          `${r.product} · ${r.dosage}${r.productVariant ? ` · ${r.productVariant}` : ""}`,
      },
      { id: "qty", label: "Qtd", type: "number", value: (r) => r.qty },
      {
        id: "stockUnits",
        label: "Ampolas/seringas",
        type: "number",
        value: (r) => (r.productVariantUnits ? r.qty * r.productVariantUnits : r.qty),
      },
      { id: "unit", label: "Valor un.", type: "money", value: (r) => r.estimatedPrice },
      {
        id: "total",
        label: "Total",
        type: "money",
        value: (r) => getReservationTotals(r).total,
      },
      { id: "signal", label: "Sinal", type: "money", value: (r) => r.signalPaid },
      {
        id: "balance",
        label: "Saldo",
        type: "money",
        value: (r) => getReservationTotals(r).balance,
      },
      { id: "payment", label: "Pagamento", value: (r) => r.payment },
      { id: "status", label: "Status", value: (r) => r.status },
      { id: "notes", label: "Observações", value: (r) => r.notes || "" },
    ],
    []
  );

  const clientColumns = useMemo<ColumnDef<Client>[]>(
    () => [
      { id: "created", label: "Cadastro", type: "date", value: (c) => c.createdAt },
      { id: "name", label: "Cliente", value: (c) => c.name },
      { id: "phone", label: "Telefone", value: (c) => c.phone },
      { id: "notes", label: "Observações", value: (c) => c.notes || "" },
      {
        id: "sales",
        label: "Vendas",
        type: "number",
        value: (c) => sales.filter((s) => s.client.toLowerCase() === c.name.toLowerCase()).length,
      },
      {
        id: "revenue",
        label: "Receita líquida",
        type: "money",
        value: (c) =>
          sales
            .filter((s) => s.client.toLowerCase() === c.name.toLowerCase())
            .reduce((sum, sale) => sum + getSaleFinancials(sale).netReceived, 0),
      },
    ],
    [sales]
  );

  const activeColumns = useMemo(() => {
    if (kind === "stock") return stockColumns;
    if (kind === "reservations") return reservationColumns;
    if (kind === "clients") return clientColumns;
    if (kind === "sales") return salesColumns;
    return financialColumns;
  }, [clientColumns, financialColumns, kind, reservationColumns, salesColumns, stockColumns]);

  useEffect(() => {
    setSelectedColumns(activeColumns.map((column) => column.id));
  }, [activeColumns]);

  const reportRows = useMemo(() => {
    if (kind === "stock") return filteredProducts;
    if (kind === "reservations") return filteredReservations;
    if (kind === "clients") return filteredClients;
    return filteredSales;
  }, [filteredClients, filteredProducts, filteredReservations, filteredSales, kind]);

  const visibleColumns = activeColumns.filter((column) => selectedColumns.includes(column.id));

  const metrics = useMemo(() => {
    const saleTotals = filteredSales.reduce(
      (acc, sale) => {
        const f = getSaleFinancials(sale);
        acc.gross += f.totalSale;
        acc.net += f.netReceived;
        acc.cost += f.totalPurchase;
        acc.profit += f.netProfit;
        acc.fees += f.totalFees;
        acc.units += sale.qty;
        return acc;
      },
      { gross: 0, net: 0, cost: 0, profit: 0, fees: 0, units: 0 }
    );

    const reservationTotals = filteredReservations.reduce(
      (acc, reservation) => {
        const total = getReservationTotals(reservation);
        acc.total += total.total;
        acc.balance += total.balance;
        acc.signal += reservation.signalPaid || 0;
        return acc;
      },
      { total: 0, balance: 0, signal: 0 }
    );

    const stockTotals = filteredProducts.reduce(
      (acc, product) => {
        const m = getProductMetrics(product);
        acc.stockValue += m.stockValue;
        acc.potentialProfit += m.potentialProfit;
        acc.units += product.stockQty;
        if (m.outOfStock) acc.alerts += 1;
        else if (m.lowStock) acc.alerts += 1;
        return acc;
      },
      { stockValue: 0, potentialProfit: 0, units: 0, alerts: 0 }
    );

    return {
      sales: saleTotals,
      reservations: reservationTotals,
      stock: stockTotals,
      margin: saleTotals.net ? saleTotals.profit / saleTotals.net : 0,
      ticket: filteredSales.length ? saleTotals.net / filteredSales.length : 0,
    };
  }, [filteredProducts, filteredReservations, filteredSales]);

  const summaryCards = useMemo<ReportSummaryCard[]>(() => {
    if (kind === "stock") {
      return [
        { label: "SKUs", value: formatNum(filteredProducts.length), tone: "gold" },
        { label: "Unidades", value: formatNum(metrics.stock.units), tone: "silver" },
        { label: "Valor estoque", value: formatBRL(metrics.stock.stockValue), tone: "silver" },
        { label: "Alertas", value: formatNum(metrics.stock.alerts), tone: metrics.stock.alerts ? "rose" : "emerald" },
      ];
    }
    if (kind === "reservations") {
      return [
        { label: "Reservas", value: formatNum(filteredReservations.length), tone: "gold" },
        { label: "Total previsto", value: formatBRL(metrics.reservations.total), tone: "silver" },
        { label: "Sinais", value: formatBRL(metrics.reservations.signal), tone: "emerald" },
        { label: "Saldo", value: formatBRL(metrics.reservations.balance), tone: "gold" },
      ];
    }
    if (kind === "clients") {
      return [
        { label: "Clientes", value: formatNum(filteredClients.length), tone: "gold" },
        { label: "Vendas no período", value: formatNum(filteredSales.length), tone: "silver" },
        { label: "Receita líquida", value: formatBRL(metrics.sales.net), tone: "emerald" },
        { label: "Ticket médio", value: formatBRL(metrics.ticket), tone: "gold" },
      ];
    }
    return [
      { label: "Vendas", value: formatNum(filteredSales.length), tone: "gold" },
      { label: "Receita líquida", value: formatBRL(metrics.sales.net), tone: "emerald" },
      { label: "Lucro líquido", value: formatBRL(metrics.sales.profit), tone: metrics.sales.profit >= 0 ? "emerald" : "rose" },
      { label: "Margem", value: formatPct(metrics.margin), tone: "gold" },
    ];
  }, [filteredClients.length, filteredProducts.length, filteredReservations.length, filteredSales.length, kind, metrics]);

  const periodText =
    period === "all"
      ? "Todo o histórico"
      : `${start ? formatDate(start) : "início"} até ${end ? formatDate(end) : "hoje"}`;

  const subtitle = `${periodLabels[period]} · ${periodText}`;

  function displayCell<T>(column: ColumnDef<T>, item: T) {
    const value = column.value(item);
    if (column.type === "money") return formatBRL(Number(value));
    if (column.type === "percent") return formatPct(Number(value));
    if (column.type === "number") return formatNum(Number(value));
    if (column.type === "date") return value ? formatDate(String(value)) : "";
    return String(value ?? "");
  }

  function exportCell<T>(column: ColumnDef<T>, item: T): ReportCell {
    const value = column.value(item);
    if (column.type === "date") return value ? formatDate(String(value)) : "";
    if (column.type === "percent") return Number(value) * 100;
    return typeof value === "number" ? value : String(value ?? "");
  }

  function buildDetailSheet(): ReportSheet {
    return {
      name: reportTitle(),
      columns: visibleColumns.map((column) => column.label),
      rows: reportRows.map((row) =>
        visibleColumns.map((column) => exportCell(column as ColumnDef<any>, row))
      ),
    };
  }

  function buildDisplaySheet<T>(
    name: string,
    columns: ColumnDef<T>[],
    rows: T[]
  ): ReportSheet {
    return {
      name,
      columns: columns.map((column) => column.label),
      rows: rows.map((row) => columns.map((column) => displayCell(column, row))),
    };
  }

  function buildPdfSheets() {
    if (kind === "executive") {
      return [
        buildDisplaySheet("Financeiro", financialColumns, filteredSales),
        buildDisplaySheet("Estoque", stockColumns, filteredProducts),
        buildDisplaySheet("Reservas", reservationColumns, filteredReservations),
      ].filter((sheet) => sheet.rows.length > 0);
    }

    return [
      buildDisplaySheet(
        reportTitle(),
        visibleColumns as ColumnDef<any>[],
        reportRows as any[]
      ),
    ];
  }

  function buildSummarySheet(): ReportSheet {
    const filterRows = [
      ["Tipo", presets.find((preset) => preset.id === kind)?.label || kind],
      ["Período", periodText],
      ["Produto", productFilter || "Todos"],
      ["Status", statusFilter || "Todos"],
      ["Pagamento", paymentFilter || "Todos"],
      ["Registros", reportRows.length],
    ];

    return {
      name: "Resumo",
      columns: ["Indicador", "Valor"],
      rows: [
        ...summaryCards.map((card) => [card.label, card.value]),
        [],
        ["Filtros", ""],
        ...filterRows,
      ],
    };
  }

  function buildExecutiveSheets(): ReportSheet[] {
    const financialSheet: ReportSheet = {
      name: "Financeiro",
      columns: financialColumns.map((column) => column.label),
      rows: filteredSales.map((sale) =>
        financialColumns.map((column) => exportCell(column, sale))
      ),
    };
    const stockSheet: ReportSheet = {
      name: "Estoque",
      columns: stockColumns.map((column) => column.label),
      rows: filteredProducts.map((product) =>
        stockColumns.map((column) => exportCell(column, product))
      ),
    };
    const reservationsSheet: ReportSheet = {
      name: "Reservas",
      columns: reservationColumns.map((column) => column.label),
      rows: filteredReservations.map((reservation) =>
        reservationColumns.map((column) => exportCell(column, reservation))
      ),
    };
    return [buildSummarySheet(), financialSheet, stockSheet, reservationsSheet];
  }

  function buildSheets() {
    return kind === "executive"
      ? buildExecutiveSheets()
      : [buildSummarySheet(), buildDetailSheet()];
  }

  function reportTitle() {
    return presets.find((preset) => preset.id === kind)?.label
      ? `Relatório ${presets.find((preset) => preset.id === kind)?.label}`
      : "Relatório";
  }

  function buildInsights() {
    const byProduct = new Map<string, number>();
    filteredSales.forEach((sale) => {
      byProduct.set(
        sale.product,
        (byProduct.get(sale.product) || 0) + getSaleFinancials(sale).netReceived
      );
    });
    const bestProduct = Array.from(byProduct.entries()).sort((a, b) => b[1] - a[1])[0];
    const insights: string[] = [];
    if (bestProduct) {
      insights.push(
        `Produto com maior receita líquida no período: ${bestProduct[0]} (${formatBRL(bestProduct[1])}).`
      );
    }
    if (metrics.sales.fees > 0) {
      insights.push(`Taxas registradas no período somam ${formatBRL(metrics.sales.fees)}.`);
    }
    if (metrics.stock.alerts > 0) {
      insights.push(`${metrics.stock.alerts} produto(s) exigem atenção de estoque.`);
    }
    if (metrics.reservations.balance > 0) {
      insights.push(`Reservas em aberto têm ${formatBRL(metrics.reservations.balance)} em saldo previsto.`);
    }
    return insights;
  }

  function exportExcel() {
    if (reportRows.length === 0 && kind !== "executive") {
      toast.error("Não há dados para exportar");
      return;
    }
    exportExcelWorkbook(
      `tirzenix-${fileSafe(reportTitle())}-${localISO()}.xls`,
      buildSheets()
    );
    toast.success("Relatório Excel gerado");
  }

  function exportPdf() {
    if (reportRows.length === 0 && kind !== "executive") {
      toast.error("Não há dados para gerar PDF");
      return;
    }
    const opened = openPdfReport({
      title: reportTitle(),
      subtitle,
      generatedAt: `${formatDate(localISO())} às ${new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      settings,
      summary: summaryCards,
      sheets: buildPdfSheets(),
      insights: buildInsights(),
    });
    if (opened) toast.success("PDF aberto para impressão");
    else toast.error("Permita pop-ups para gerar o PDF");
  }

  function toggleColumn(id: string) {
    setSelectedColumns((current) =>
      current.includes(id)
        ? current.filter((columnId) => columnId !== id)
        : [...current, id]
    );
  }

  function selectPreset(nextKind: ReportKind) {
    setKind(nextKind);
    setStatusFilter("");
    setPaymentFilter("");
  }

  const statusOptions = kind === "reservations" ? reservationStatuses : saleStatuses;
  const previewRows = reportRows.slice(0, 12);

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Construtor profissional com Excel e PDF no design da Tirzenix"
        actions={
          <>
            <button className="btn-secondary" onClick={exportPdf}>
              <FileText size={16} /> PDF
            </button>
            <button className="btn-primary" onClick={exportExcel}>
              <FileSpreadsheet size={16} /> Excel
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
          >
            {presets.map((preset) => {
              const Icon = preset.icon;
              const active = kind === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectPreset(preset.id)}
                  className={cn(
                    "group text-left rounded-2xl border p-4 transition relative overflow-hidden",
                    active
                      ? "bg-gold-500/12 border-gold-500/50 shadow-glow-sm"
                      : "bg-ink-900/60 border-gold-900/20 hover:border-gold-700/40"
                  )}
                >
                  <div className="absolute -right-8 -top-8 size-24 rounded-full bg-gold-600/10 blur-2xl" />
                  <div className="relative flex items-start gap-3">
                    <span
                      className={cn(
                        "size-10 rounded-xl grid place-items-center shrink-0 ring-1",
                        active
                          ? "bg-gold-500/20 text-gold-200 ring-gold-500/40"
                          : "bg-ink-950/70 text-silver-400 ring-gold-900/30 group-hover:text-gold-300"
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    <span>
                      <span className="flex items-center gap-2 text-sm font-semibold text-silver-50">
                        {preset.label}
                        {active && <Check size={14} className="text-gold-300" />}
                      </span>
                      <span className="block text-xs text-silver-400 leading-snug mt-1">
                        {preset.description}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="card p-5"
          >
            <div className="flex items-center gap-2 text-gold-400 mb-4">
              <Filter size={15} />
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-400">
                Filtros
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <label className="block">
                <span className="label">Período</span>
                <select className="input" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
                  {Object.entries(periodLabels).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Data inicial</span>
                <input
                  type="date"
                  className="input"
                  value={start}
                  disabled={period !== "custom"}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="label">Data final</span>
                <input
                  type="date"
                  className="input"
                  value={end}
                  disabled={period !== "custom"}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="label">Produto</span>
                <select className="input" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
                  <option value="">Todos</option>
                  {productNames.map((product) => (
                    <option key={product}>{product}</option>
                  ))}
                </select>
              </label>
              {kind !== "stock" && kind !== "clients" && (
                <label className="block">
                  <span className="label">Status</span>
                  <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">Todos</option>
                    {statusOptions.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
              )}
              {kind !== "stock" && kind !== "clients" && (
                <label className="block">
                  <span className="label">Pagamento</span>
                  <select className="input" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                    <option value="">Todos</option>
                    {settings.paymentMethods.map((payment) => (
                      <option key={payment}>{payment}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="card overflow-hidden"
          >
            <div className="p-5 border-b border-gold-900/20 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-gold-400">
                  <BarChart3 size={15} />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-400">
                    Prévia do relatório
                  </h3>
                </div>
                <p className="text-xs text-silver-500 mt-1">{subtitle}</p>
              </div>
              <span className="text-xs text-silver-400">
                {formatNum(reportRows.length)} registro(s)
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5">
              {summaryCards.map((card) => (
                <Kpi key={card.label} {...card} />
              ))}
            </div>

            {previewRows.length === 0 ? (
              <div className="p-5">
                <Empty
                  icon={FileText}
                  title="Nenhum dado para estes filtros"
                  description="Ajuste o período, produto, status ou pagamento para gerar uma nova prévia."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-ink-900/80 sticky top-0 z-10">
                    <tr>
                      {visibleColumns.map((column) => (
                        <th
                          key={column.id}
                          className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-gold-400 font-semibold whitespace-nowrap"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold-900/15">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gold-900/10">
                        {visibleColumns.map((column) => (
                          <td
                            key={column.id}
                            className="px-4 py-3 text-silver-200 whitespace-nowrap"
                          >
                            {displayCell(column as ColumnDef<any>, row)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>

        <aside className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="card p-5"
          >
            <div className="flex items-center gap-2 text-gold-400 mb-3">
              <Settings2 size={15} />
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-400">
                Colunas
              </h3>
            </div>
            <p className="text-xs text-silver-500 mb-4">
              Selecione exatamente o que deve sair no Excel e PDF.
            </p>
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {activeColumns.map((column) => {
                const checked = selectedColumns.includes(column.id);
                return (
                  <button
                    key={column.id}
                    type="button"
                    onClick={() => toggleColumn(column.id)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ring-1",
                      checked
                        ? "bg-gold-500/12 text-gold-100 ring-gold-700/40"
                        : "bg-ink-950/40 text-silver-400 ring-gold-900/20 hover:text-silver-200"
                    )}
                  >
                    <span
                      className={cn(
                        "size-4 rounded border grid place-items-center shrink-0",
                        checked ? "bg-gold-400 border-gold-300 text-ink-950" : "border-silver-600"
                      )}
                    >
                      {checked && <Check size={12} />}
                    </span>
                    {column.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedColumns(activeColumns.map((column) => column.id))}
              >
                Todas
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedColumns(activeColumns.slice(0, 6).map((column) => column.id))}
              >
                Essenciais
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.06 }}
            className="card p-5 bg-gradient-to-br from-ink-900 via-ink-850 to-gold-950/30"
          >
            <div className="flex items-center gap-2 text-gold-300">
              <Download size={15} />
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em]">
                Saídas
              </h3>
            </div>
            <div className="space-y-2 mt-4">
              <button className="btn-primary w-full" onClick={exportExcel}>
                <FileSpreadsheet size={16} /> Gerar Excel
              </button>
              <button className="btn-secondary w-full" onClick={exportPdf}>
                <FileText size={16} /> Gerar PDF
              </button>
            </div>
            <p className="text-[11px] text-silver-500 mt-3 leading-relaxed">
              O Excel é gerado com abas, cabeçalho e estilos da Tirzenix. O PDF abre em uma visualização pronta para salvar ou imprimir.
            </p>
          </motion.div>
        </aside>
      </div>
    </>
  );
}

function Kpi({ label, value, tone = "gold" }: ReportSummaryCard) {
  const toneClass: Record<NonNullable<Tone>, string> = {
    gold: "text-gold-200",
    silver: "text-silver-100",
    emerald: "text-emerald-300",
    rose: "text-rose-300",
  };
  return (
    <div className="rounded-xl bg-ink-950/60 border border-gold-900/25 px-4 py-3">
      <p className="text-[9px] uppercase tracking-[0.18em] text-silver-500 font-semibold">
        {label}
      </p>
      <p className={cn("text-lg font-bold mt-1 tabular-nums", toneClass[tone])}>
        {value}
      </p>
    </div>
  );
}
