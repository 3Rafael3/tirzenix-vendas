import type { Product, ProductVariant, Settings } from "@/lib/types";

export const DEFAULT_PACKAGE_UNITS = 4;

export const defaultAmpouleVariants: ProductVariant[] = [
  { id: "1-ampola", label: "1 ampola", units: 1 },
  { id: "2-ampolas", label: "2 ampolas", units: 2 },
  { id: "3-ampolas", label: "3 ampolas", units: 3 },
  { id: "4-ampolas", label: "4 ampolas (caixa fechada)", units: 4, closedBox: true },
];

export const defaultSyringeVariants: ProductVariant[] = [
  { id: "1-seringa", label: "1 seringa", units: 1 },
  { id: "2-seringas", label: "2 seringas", units: 2 },
  { id: "3-seringas", label: "3 seringas", units: 3 },
  { id: "4-seringas", label: "4 seringas (caixa fechada)", units: 4, closedBox: true },
];

export const gluconexVariants: ProductVariant[] = [
  ...defaultAmpouleVariants,
  ...defaultSyringeVariants,
];

export function usesMixedUnits(productName: string) {
  return productName.trim().toLowerCase() === "gluconex";
}

export function defaultVariantsForProduct(productName: string) {
  return usesMixedUnits(productName) ? gluconexVariants : defaultAmpouleVariants;
}

export function unitFromVariantLabel(variantLabel?: string) {
  return variantLabel?.toLowerCase().includes("seringa") ? "seringa" : "ampola";
}

export function stockUnitSingular(productName: string, variantLabel?: string) {
  if (usesMixedUnits(productName) && variantLabel) return unitFromVariantLabel(variantLabel);
  return "ampola";
}

export function stockUnitPlural(productName: string, variantLabel?: string) {
  return stockUnitSingular(productName, variantLabel) === "seringa" ? "seringas" : "ampolas";
}

export function stockUnitText(productName: string, qty: number, variantLabel?: string) {
  return `${qty} ${qty === 1 ? stockUnitSingular(productName, variantLabel) : stockUnitPlural(productName, variantLabel)}`;
}

export function packageUnitsFor(product?: Pick<Product, "packageUnits"> | null) {
  return Math.max(1, product?.packageUnits || DEFAULT_PACKAGE_UNITS);
}

function hasSyringeLabels(variants: ProductVariant[] | undefined) {
  return !!variants?.some((variant) => variant.label.toLowerCase().includes("seringa"));
}

function hasAmpouleLabels(variants: ProductVariant[] | undefined) {
  return !!variants?.some((variant) => variant.label.toLowerCase().includes("ampola"));
}

export function variantsForProduct(
  settings: Settings,
  productName: string,
  product?: Pick<Product, "variants"> | null
) {
  const custom = product?.variants?.length
    ? product.variants
    : settings.productVariants?.[productName];
  if (usesMixedUnits(productName) && (!hasSyringeLabels(custom) || !hasAmpouleLabels(custom))) {
    return gluconexVariants;
  }
  return custom?.length ? custom : defaultVariantsForProduct(productName);
}

export function normalizeSettingsProductVariants(settings: Settings): Settings {
  const productVariants = { ...(settings.productVariants || {}) };
  for (const productName of settings.products || []) {
    const current = productVariants[productName];
    if (usesMixedUnits(productName) && (!hasSyringeLabels(current) || !hasAmpouleLabels(current))) {
      productVariants[productName] = gluconexVariants;
    } else if (!current?.length) {
      productVariants[productName] = defaultVariantsForProduct(productName);
    }
  }
  return { ...settings, productVariants };
}

export function priceForVariant(basePrice: number, units: number, packageUnits = DEFAULT_PACKAGE_UNITS) {
  const safeUnits = Math.max(1, units || 1);
  const safePackageUnits = Math.max(1, packageUnits || DEFAULT_PACKAGE_UNITS);
  return basePrice * (safeUnits / safePackageUnits);
}

export function purchasePriceForVariant(product: Product, variant: ProductVariant) {
  return variant.purchasePrice ?? priceForVariant(product.purchasePrice, variant.units, packageUnitsFor(product));
}

export function salePriceForVariant(product: Product, variant: ProductVariant) {
  return variant.salePrice ?? priceForVariant(product.salePrice, variant.units, packageUnitsFor(product));
}

export function formatVariantSuffix(variant?: string) {
  return variant ? ` · ${variant}` : "";
}
