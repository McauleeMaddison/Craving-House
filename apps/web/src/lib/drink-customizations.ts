export type Syrup = "caramel" | "vanilla" | "chocolate" | "hazelnut";

export type DrinkExtra = "extra-shot" | "oat-milk" | "whipped-cream";

export type HotDogAddOn = "mozzarella" | "shoestring-potatoes";

export type DrinkTopping =
  | "biscuit-crumbs"
  | "nutella"
  | "dulce-de-leche"
  | "sprinkles"
  | "chocolate-chips"
  | "mini-marshmallows";

export type WaffleTopping =
  | DrinkTopping
  | "soft-ice-cream";

export type MealAddOn = "add-chips";

export type ProductCustomizationKind = "drink" | "hotdog" | "waffle" | "meal";

export type DrinkCustomizations = {
  sugar?: 0 | 1 | 2 | 3 | 4;
  syrups?: Syrup[];
  extras?: DrinkExtra[];
  drinkToppings?: DrinkTopping[];
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

export const DRINK_TOPPING_OPTIONS: Array<{ key: DrinkTopping; label: string; priceCents: number }> = [
  { key: "biscuit-crumbs", label: "Biscuit crumbs", priceCents: 110 },
  { key: "nutella", label: "Nutella", priceCents: 110 },
  { key: "dulce-de-leche", label: "Dulce de Leche", priceCents: 130 },
  { key: "sprinkles", label: "Sprinkles", priceCents: 110 },
  { key: "chocolate-chips", label: "Chocolate chips", priceCents: 120 },
  { key: "mini-marshmallows", label: "Mini marshmallows", priceCents: 120 }
];

export const WAFFLE_TOPPING_OPTIONS: Array<{ key: WaffleTopping; label: string; priceCents: number }> = [
  ...DRINK_TOPPING_OPTIONS,
  { key: "soft-ice-cream", label: "Soft ice cream", priceCents: 150 }
];

export const MEAL_ADD_ON_OPTIONS: Array<{ key: MealAddOn; label: string; priceCents: number }> = [
  { key: "add-chips", label: "Add chips", priceCents: 350 }
];

const syrupLabelByKey = new Map(SYRUP_OPTIONS.map((x) => [x.key, x.label]));
const extraLabelByKey = new Map(EXTRA_OPTIONS.map((x) => [x.key, x.label]));
const hotDogAddOnLabelByKey = new Map(HOT_DOG_ADD_ON_OPTIONS.map((x) => [x.key, x.label]));
const drinkToppingLabelByKey = new Map(DRINK_TOPPING_OPTIONS.map((x) => [x.key, x.label]));
const waffleToppingLabelByKey = new Map(WAFFLE_TOPPING_OPTIONS.map((x) => [x.key, x.label]));
const mealAddOnLabelByKey = new Map(MEAL_ADD_ON_OPTIONS.map((x) => [x.key, x.label]));
const syrupKeySet = new Set(SYRUP_OPTIONS.map((x) => x.key));
const extraKeySet = new Set(EXTRA_OPTIONS.map((x) => x.key));
const drinkToppingKeySet = new Set(DRINK_TOPPING_OPTIONS.map((x) => x.key));
const hotDogAddOnKeySet = new Set(HOT_DOG_ADD_ON_OPTIONS.map((x) => x.key));
const waffleToppingKeySet = new Set(WAFFLE_TOPPING_OPTIONS.map((x) => x.key));
const mealAddOnKeySet = new Set(MEAL_ADD_ON_OPTIONS.map((x) => x.key));

function normalizeProductText(input: string | null | undefined) {
  return (input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

const standaloneModifierNames = new Set(
  [...HOT_DOG_ADD_ON_OPTIONS, ...WAFFLE_TOPPING_OPTIONS, ...MEAL_ADD_ON_OPTIONS].map((x) => normalizeProductText(x.label))
);

function normalizeModifierKey(input: unknown): string {
  if (typeof input === "string") {
    return input
      .toLowerCase()
      .trim()
      .replace(/[_\s]+/g, "-")
      .replace(/-+/g, "-");
  }
  if (typeof input === "object" && input !== null) {
    const record = input as Record<string, unknown>;
    if (typeof record.key === "string") return normalizeModifierKey(record.key);
    if (typeof record.id === "string") return normalizeModifierKey(record.id);
    if (typeof record.value === "string") return normalizeModifierKey(record.value);
    if (typeof record.name === "string") return normalizeModifierKey(record.name);
  }
  return "";
}

function normalizeStringArray<T extends string>(input: unknown, allowed: Set<T>) {
  if (!Array.isArray(input)) return [] as T[];
  const values = input
    .map(normalizeModifierKey)
    .filter((x): x is T => Boolean(x) && allowed.has(x as T));
  return Array.from(new Set(values));
}

function getArrayField(raw: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function getOptionPriceCents<T extends string>(keys: T[] | undefined, options: Array<{ key: T; priceCents: number }>) {
  if (!keys?.length) return 0;
  const optionByKey = new Map(options.map((x) => [x.key, x.priceCents]));
  return keys.reduce((sum, key) => sum + (optionByKey.get(key) ?? 0), 0);
}

export function normalizeCustomizations(input: unknown): DrinkCustomizations | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const sugarNum = Number(raw.sugar);
  const sugar = [1, 2, 3, 4].includes(sugarNum) ? (sugarNum as 1 | 2 | 3 | 4) : undefined;

  const genericAddOns = normalizeStringArray(
    getArrayField(raw, ["addOns", "addons", "modifiers"]),
    new Set<string>([
      ...extraKeySet,
      ...drinkToppingKeySet,
      ...hotDogAddOnKeySet,
      ...waffleToppingKeySet,
      ...mealAddOnKeySet
    ])
  );

  const syrups = normalizeStringArray(
    getArrayField(raw, ["syrups", "syrupOptions", "syrup"]),
    syrupKeySet
  );
  const extras = Array.from(
    new Set([
      ...normalizeStringArray(
        getArrayField(raw, ["extras", "drinkExtras", "coffeeAddOns", "coffeeAddons"]),
        extraKeySet
      ),
      ...genericAddOns.filter((x): x is DrinkExtra => extraKeySet.has(x as DrinkExtra))
    ])
  );
  const drinkToppings = Array.from(
    new Set([
      ...normalizeStringArray(
        getArrayField(raw, ["drinkToppings", "drinkAddOns", "drinkAddons"]),
        drinkToppingKeySet
      ),
      ...genericAddOns.filter((x): x is DrinkTopping => drinkToppingKeySet.has(x as DrinkTopping))
    ])
  );
  const hotDogAddOns = Array.from(
    new Set([
      ...normalizeStringArray(
        getArrayField(raw, ["hotDogAddOns", "hotDogAddons", "hotdogAddOns", "hotdogAddons"]),
        hotDogAddOnKeySet
      ),
      ...genericAddOns.filter((x): x is HotDogAddOn => hotDogAddOnKeySet.has(x as HotDogAddOn))
    ])
  );
  const waffleToppings = Array.from(
    new Set([
      ...normalizeStringArray(
        getArrayField(raw, ["waffleToppings", "waffleAddOns", "waffleAddons"]),
        waffleToppingKeySet
      ),
      ...genericAddOns.filter((x): x is WaffleTopping => waffleToppingKeySet.has(x as WaffleTopping))
    ])
  );
  const mealAddOns = Array.from(
    new Set([
      ...normalizeStringArray(
        getArrayField(raw, ["mealAddOns", "mealAddons"]),
        mealAddOnKeySet
      ),
      ...genericAddOns.filter((x): x is MealAddOn => mealAddOnKeySet.has(x as MealAddOn))
    ])
  );

  const cleaned: DrinkCustomizations = {};
  if (typeof sugar === "number") cleaned.sugar = sugar;
  if (syrups.length) cleaned.syrups = syrups;
  if (extras.length) cleaned.extras = extras;
  if (drinkToppings.length) cleaned.drinkToppings = drinkToppings;
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
  const drinkToppings = normalized.drinkToppings ? [...normalized.drinkToppings].sort().join(",") : "";
  const hotDogAddOns = normalized.hotDogAddOns ? [...normalized.hotDogAddOns].sort().join(",") : "";
  const waffleToppings = normalized.waffleToppings ? [...normalized.waffleToppings].sort().join(",") : "";
  const mealAddOns = normalized.mealAddOns ? [...normalized.mealAddOns].sort().join(",") : "";
  return `s${sugar}|y${syrups}|e${extras}|t${drinkToppings}|h${hotDogAddOns}|w${waffleToppings}|m${mealAddOns}`;
}

export function getCustomizationPriceCents(custom: unknown): number {
  const normalized = normalizeCustomizations(custom);
  if (!normalized) return 0;

  return (
    getOptionPriceCents(normalized.syrups, SYRUP_OPTIONS) +
    getOptionPriceCents(normalized.extras, EXTRA_OPTIONS) +
    getOptionPriceCents(normalized.drinkToppings, DRINK_TOPPING_OPTIONS) +
    getOptionPriceCents(normalized.hotDogAddOns, HOT_DOG_ADD_ON_OPTIONS) +
    getOptionPriceCents(normalized.waffleToppings, WAFFLE_TOPPING_OPTIONS) +
    getOptionPriceCents(normalized.mealAddOns, MEAL_ADD_ON_OPTIONS)
  );
}

export function isStandaloneModifierProduct(product: { name?: string | null; description?: string | null }) {
  const name = normalizeProductText(product.name);
  const description = normalizeProductText(product.description);

  return (
    standaloneModifierNames.has(name) ||
    /^(hot ?dogs?|meals?) add ?ons?$/.test(description) ||
    /^waffles? toppings?$/.test(description)
  );
}

export function getProductCustomizationKind(product: {
  name: string;
  description?: string | null;
  loyaltyEligible?: boolean;
}): ProductCustomizationKind | null {
  const name = normalizeProductText(product.name);
  const description = normalizeProductText(product.description);

  if (isStandaloneModifierProduct(product)) return null;

  if (
    product.loyaltyEligible ||
    /hot drinks?/.test(description) ||
    /\b(espresso|coffee|cappuccino|americano|flat white|mocha|cortado|latte|tea|hot chocolate|chai|turmeric)\b/.test(name)
  ) {
    return "drink";
  }

  if (/^hot ?dogs?$/.test(description)) return "hotdog";
  if (/^waffles?$/.test(description)) return "waffle";
  if (/^meals?$/.test(description) && !/\bwith chips\b/i.test(name)) return "meal";

  return null;
}

export function supportsProductCustomizations(product: {
  name: string;
  description?: string | null;
  loyaltyEligible?: boolean;
}) {
  return getProductCustomizationKind(product) !== null;
}

export function supportsDrinkToppings(product: {
  name: string;
  description?: string | null;
  loyaltyEligible?: boolean;
}) {
  if (getProductCustomizationKind(product) !== "drink") return false;

  const name = normalizeProductText(product.name);
  const description = normalizeProductText(product.description);
  return (
    /hot drinks?/.test(description) &&
    !/\b(chai|turmeric|tea)\b/.test(name) &&
    /\b(hot chocolate|espresso|coffee|cappuccino|americano|flat white|mocha|cortado|latte)\b/.test(name)
  );
}

export function normalizeCustomizationsForProduct(
  product: { name: string; description?: string | null; loyaltyEligible?: boolean },
  input: unknown
): DrinkCustomizations | null {
  const normalized = normalizeCustomizations(input);
  const kind = getProductCustomizationKind(product);
  if (!normalized || !kind) return null;

  const cleaned: DrinkCustomizations = {};

  if (kind === "drink") {
    if (typeof normalized.sugar === "number") cleaned.sugar = normalized.sugar;
    if (normalized.syrups?.length) cleaned.syrups = normalized.syrups;
    if (normalized.extras?.length) cleaned.extras = normalized.extras;
    if (supportsDrinkToppings(product) && normalized.drinkToppings?.length) {
      cleaned.drinkToppings = normalized.drinkToppings;
    }
  }

  if (kind === "hotdog" && normalized.hotDogAddOns?.length) {
    cleaned.hotDogAddOns = normalized.hotDogAddOns;
  }

  if (kind === "waffle" && normalized.waffleToppings?.length) {
    cleaned.waffleToppings = normalized.waffleToppings;
  }

  if (kind === "meal" && normalized.mealAddOns?.length) {
    cleaned.mealAddOns = normalized.mealAddOns;
  }

  return Object.keys(cleaned).length ? cleaned : null;
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
  if (normalized.drinkToppings?.length) {
    parts.push(`Drink toppings: ${normalized.drinkToppings.map((x) => drinkToppingLabelByKey.get(x) ?? x).join(", ")}`);
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
