import { getCustomizationPriceCents } from "./drink-customizations.ts";

export const PICKUP_SMALL_ORDER_THRESHOLD_CENTS = 400;
export const PICKUP_SMALL_ORDER_FEE_CENTS = 75;

export function getLineUnitPriceCents(basePriceCents: number, customizations: unknown) {
  return Math.max(0, Math.round(basePriceCents)) + getCustomizationPriceCents(customizations);
}

export function getPickupSmallOrderFeeCents(itemsSubtotalCents: number) {
  const subtotal = Math.max(0, Math.round(itemsSubtotalCents));
  if (subtotal === 0) return 0;
  return subtotal < PICKUP_SMALL_ORDER_THRESHOLD_CENTS ? PICKUP_SMALL_ORDER_FEE_CENTS : 0;
}

export function getDerivedOrderFeeCents(params: { itemsSubtotalCents: number; totalCents: number }) {
  return Math.max(0, Math.round(params.totalCents) - Math.round(params.itemsSubtotalCents));
}
