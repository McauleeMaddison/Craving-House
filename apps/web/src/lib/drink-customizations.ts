export type Syrup = "caramel" | "vanilla" | "chocolate" | "hazelnut";

export type DrinkExtra = "extra-shot" | "oat-milk" | "whipped-cream";

export type HotDogAddOn = "mozzarella" | "shoestring-potatoes";

export type WaffleTopping =
  | "biscuit-crumbs"
  | "nutella"
  | "dulce-de-leche"
  | "sprinkles"
  | "chocolate-chips"
  | "mini-marshmallows"
  | "soft-ice-cream";

export type MealAddOn = "add-chips";

export type ProductCustomizationKind = "drink" | "hotdog" | "waffle" | "meal";

export type DrinkCustomizations = {
  sugar?: 0 | 1 | 2 | 3 | 4;
  syrups?: Syrup[];
  extras?: DrinkExtra[];
  hotDogAddOns?: HotDogAddOn[];
  waffleToppings?: WaffleTopping[];
  mealAddOns?: MealAddOn[];
};

export const PAID_MODIFIER_PRICE_CENTS = 120;

export const SYRUP_OPTIONS: Array<{ key: Syrup; label: string; priceCents: number }> = [
  { key: "caramel", label: "Caramel", priceCents: PAID_MODIFIER_PRICE_CENTS },
  { key: "vanilla", label: "Vanilla", priceCents: PAID_MODIFIER_PRICE_CENTS },
  { key: "chocolate", label: "Chocolate", priceCents: PAID_MODIFIER_PRICE_CENTS },
  { key: "hazelnut", label: "Hazelnut", priceCents: PAID_MODIFIER_PRICE_CENTS }
];

export const EXTRA_OPTIONS: Array<{ key: DrinkExtra; label: string; priceCents: number }> = [
  { key: "extra-shot", label: "Extra shot", priceCents: PAID_MODIFIER_PRICE_CENTS },
  { key: "oat-milk", label: "Oat milk", priceCents: PAID_MODIFIER_PRICE_CENTS },
  { key: "whipped-cream", label: "Whipped cream", priceCents: PAID_MODIFIER_PRICE_CENTS }
];

export const HOT_DOG_ADD_ON_OPTIONS: Array<{ key: HotDogAddOn; label: string; priceCents: number }> = [
  { key: "mozzarella", label: "Mozzarella", priceCents: 100 },
  { key: "shoestring-potatoes", label: "Shoestring potatoes", priceCents: 100 }
];

export const WAFFLE_TOPPING_OPTIONS: Array<{ key: WaffleTopping; label: string; priceCents: number }> = [
  { key: "biscuit-crumbs", label: "Biscuit crumbs", priceCents: 110 },
  { key: "nutella", label: "Nutella", priceCents: 110 },
  { key: "dulce-de-leche", label: "Dulce de Leche", priceCents: 130 },
  { key: "sprinkles", label: "Sprinkles", priceCents: 110 },
  { key: "chocolate-chips", label: "Chocolate chips", priceCents: 120 },
  { key: "mini-marshmallows", label: "Mini marshmallows", priceCents: 120 },
  { key: "soft-ice-cream", label: "Soft ice cream", priceCents: 150 }
];

export const MEAL_ADD_ON_OPTIONS: Array<{ key: MealAddOn; label: string; priceCents: number }> = [
  { key: "add-chips", label: "Add chips", priceCents: 350 }
];

const syrupLabelByKey = new Map(SYRUP_OPTIONS.map((x) => [x.key, x.label]));
const extraLabelByKey = new Map(EXTRA_OPTIONS.map((x) => [x.key, x.label]));
const hotDogAddOnLabelByKey = new Map(HOT_DOG_ADD_ON_OPTIONS.map((x) => [x.key, x.label]));
const waffleToppingLabelByKey = new Map(WAFFLE_TOPPING_OPTIONS.map((x) => [x.key, x.label]));
const mealAddOnLabelByKey = new Map(MEAL_ADD_ON_OPTIONS.map((x) => [x.key, x.label]));

function normalizeStringArray<T extends string>(input: unknown, allowed: Set<T>) {
  if (!Array.isArray(input)) return [] as T[];
  const values = input.map((x) => String(x)).filter((x): x is T => allowed.has(x as T));
  return Array.from(new Set(values));
}

function getOptionPriceCents<T extends string>(keys: T[] | undefined, options: Array<{ key: T; priceCents: number }>) {
  if (!keys?.length) return 0;
  const optionByKey = new Map(options.map((x) => [x.key, x.priceCents]));
  return keys.reduce((sum, key) => sum + (optionByKey.get(key) ?? 0), 0);
}

export function normalizeCustomizations(input: unknown): DrinkCustomizations | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const sugarNum = raw.sugar;
  const sugar = [1, 2, 3, 4].includes(sugarNum as number) ? (sugarNum as 1 | 2 | 3 | 4) : undefined;

  const syrups = normalizeStringArray(raw.syrups, new Set(SYRUP_OPTIONS.map((x) => x.key)));
  const extras = normalizeStringArray(raw.extras, new Set(EXTRA_OPTIONS.map((x) => x.key)));
  const hotDogAddOns = normalizeStringArray(raw.hotDogAddOns, new Set(HOT_DOG_ADD_ON_OPTIONS.map((x) => x.key)));
  const waffleToppings = normalizeStringArray(raw.waffleToppings, new Set(WAFFLE_TOPPING_OPTIONS.map((x) => x.key)));
  const mealAddOns = normalizeStringArray(raw.mealAddOns, new Set(MEAL_ADD_ON_OPTIONS.map((x) => x.key)));

  const cleaned: DrinkCustomizations = {};
  if (typeof sugar === "number") cleaned.sugar = sugar;
  if (syrups.length) cleaned.syrups = syrups;
  if (extras.length) cleaned.extras = extras;
  if (hotDogAddOns.length) cleaned.hotDogAddOns = hotDogAddOns;
  if (waffleToppings.length) cleaned.waffleToppings = waffleToppings;
  if (mealAddOns.length) cleaned.mealAddOns = mealAddOns;

  return Object.keys(cleaned).length ? cleaned : null;
}

export function customizationsKey(custom: DrinkCustomizations | null | undefined): string {
  const normalized = normalizeCustomizations(custom);
  if (!normalized) return "base";
  const sugar = typeof normalized.sugar === "number" ? normalized.sugar : "";
  const syrups = normalized.syrups ? [...normalized.syrups].sort().join(",") : "";
  const extras = normalized.extras ? [...normalized.extras].sort().join(",") : "";
  const hotDogAddOns = normalized.hotDogAddOns ? [...normalized.hotDogAddOns].sort().join(",") : "";
  const waffleToppings = normalized.waffleToppings ? [...normalized.waffleToppings].sort().join(",") : "";
  const mealAddOns = normalized.mealAddOns ? [...normalized.mealAddOns].sort().join(",") : "";
  return `s${sugar}|y${syrups}|e${extras}|h${hotDogAddOns}|w${waffleToppings}|m${mealAddOns}`;
}

export function getCustomizationPriceCents(custom: unknown): number {
  const normalized = normalizeCustomizations(custom);
  if (!normalized) return 0;

  return (
    getOptionPriceCents(normalized.syrups, SYRUP_OPTIONS) +
    getOptionPriceCents(normalized.extras, EXTRA_OPTIONS) +
    getOptionPriceCents(normalized.hotDogAddOns, HOT_DOG_ADD_ON_OPTIONS) +
    getOptionPriceCents(normalized.waffleToppings, WAFFLE_TOPPING_OPTIONS) +
    getOptionPriceCents(normalized.mealAddOns, MEAL_ADD_ON_OPTIONS)
  );
}

export function isStandaloneModifierProduct(product: { description?: string | null }) {
  const description = (product.description ?? "").toLowerCase();
  return description === "hot dogs add-on" || description === "waffle topping" || description === "meals add-on";
}

export function getProductCustomizationKind(product: {
  name: string;
  description?: string | null;
  loyaltyEligible?: boolean;
}): ProductCustomizationKind | null {
  const name = product.name.toLowerCase();
  const description = (product.description ?? "").toLowerCase();

  if (isStandaloneModifierProduct(product)) return null;

  if (
    product.loyaltyEligible ||
    /hot drinks?/.test(description) ||
    /\b(espresso|coffee|cappuccino|americano|flat white|mocha|cortado|latte|tea|hot chocolate|chai|turmeric)\b/.test(name)
  ) {
    return "drink";
  }

  if (description === "hot dogs") return "hotdog";
  if (description === "waffles") return "waffle";
  if (description === "meals" && !/\bwith chips\b/i.test(name)) return "meal";

  return null;
}

export function supportsProductCustomizations(product: {
  name: string;
  description?: string | null;
  loyaltyEligible?: boolean;
}) {
  return getProductCustomizationKind(product) !== null;
}

export function getCustomizationUiCopy(kind: ProductCustomizationKind) {
  switch (kind) {
    case "drink":
      return {
        title: "Customise your drink",
        help: "Sugar is free. Syrups and coffee add-ons are charged per drink.",
        buttonLabel: "Customise drink"
      };
    case "hotdog":
      return {
        title: "Customise your hot dog",
        help: "Choose add-ons. Each add-on is charged per item.",
        buttonLabel: "Customise hot dog"
      };
    case "waffle":
      return {
        title: "Customise your waffle",
        help: "Choose toppings. Each topping is charged per waffle.",
        buttonLabel: "Add toppings"
      };
    case "meal":
      return {
        title: "Customise your meal",
        help: "Add sides only when you want them.",
        buttonLabel: "Customise meal"
      };
  }
}

export function formatCustomizations(custom: unknown): string {
  const normalized = normalizeCustomizations(custom);
  if (!normalized) return "";

  const parts: string[] = [];
  if (typeof normalized.sugar === "number") parts.push(`Sugar: ${normalized.sugar}`);
  if (normalized.syrups?.length) {
    parts.push(`Syrup: ${normalized.syrups.map((x) => syrupLabelByKey.get(x) ?? x).join(", ")}`);
  }
  if (normalized.extras?.length) {
    parts.push(`Extras: ${normalized.extras.map((x) => extraLabelByKey.get(x) ?? x).join(", ")}`);
  }
  if (normalized.hotDogAddOns?.length) {
    parts.push(`Hot dog add-ons: ${normalized.hotDogAddOns.map((x) => hotDogAddOnLabelByKey.get(x) ?? x).join(", ")}`);
  }
  if (normalized.waffleToppings?.length) {
    parts.push(`Waffle toppings: ${normalized.waffleToppings.map((x) => waffleToppingLabelByKey.get(x) ?? x).join(", ")}`);
  }
  if (normalized.mealAddOns?.length) {
    parts.push(`Meal add-ons: ${normalized.mealAddOns.map((x) => mealAddOnLabelByKey.get(x) ?? x).join(", ")}`);
  }

  return parts.join(" • ");
}
