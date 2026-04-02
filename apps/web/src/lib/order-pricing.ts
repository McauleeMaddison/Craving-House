export const PICKUP_SMALL_ORDER_THRESHOLD_CENTS = 400;
export const PICKUP_SMALL_ORDER_FEE_CENTS = 75;
const PRICE_BY_MODIFIER_KEY = new Map<string, number>([
  ["caramel", 120],
  ["vanilla", 120],
  ["chocolate", 120],
  ["hazelnut", 120],
  ["extra-shot", 120],
  ["oat-milk", 120],
  ["whipped-cream", 120],
  ["mozzarella", 100],
  ["shoestring-potatoes", 100],
  ["biscuit-crumbs", 110],
  ["nutella", 110],
  ["dulce-de-leche", 130],
  ["sprinkles", 110],
  ["chocolate-chips", 120],
  ["mini-marshmallows", 120],
  ["soft-ice-cream", 150],
  ["add-chips", 350]
]);
const MODIFIER_FIELDS = ["syrups", "extras", "hotDogAddOns", "waffleToppings", "mealAddOns"] as const;

function getCustomizationPriceCents(customizations: unknown) {
  if (!customizations || typeof customizations !== "object") return 0;
  const raw = customizations as Record<string, unknown>;

  return MODIFIER_FIELDS.reduce((sum, field) => {
    if (!Array.isArray(raw[field])) return sum;

    const keys = Array.from(new Set(raw[field].map((x) => String(x)).filter((x) => PRICE_BY_MODIFIER_KEY.has(x))));
    return sum + keys.reduce((subtotal, key) => subtotal + (PRICE_BY_MODIFIER_KEY.get(key) ?? 0), 0);
  }, 0);
}

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
