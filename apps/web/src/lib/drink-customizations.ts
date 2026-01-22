export type Syrup =
  | "caramel"
  | "vanilla"
  | "chocolate"
  | "hazelnut";

export type DrinkCustomizations = {
  sugar?: 0 | 1 | 2 | 3 | 4;
  syrups?: Syrup[];
};

export const SYRUP_OPTIONS: Array<{ key: Syrup; label: string }> = [
  { key: "caramel", label: "Caramel" },
  { key: "vanilla", label: "Vanilla" },
  { key: "chocolate", label: "Chocolate" },
  { key: "hazelnut", label: "Hazelnut" }
];

export function normalizeCustomizations(input: unknown): DrinkCustomizations | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as any;
  const sugarNum = raw?.sugar;
  const sugar = [0, 1, 2, 3, 4].includes(sugarNum) ? (sugarNum as 0 | 1 | 2 | 3 | 4) : undefined;

  const syrupsRaw = raw?.syrups;
  const allowed = new Set(SYRUP_OPTIONS.map((x) => x.key));
  const syrups =
    Array.isArray(syrupsRaw)
      ? (syrupsRaw.map((x) => String(x)) as string[]).filter((x) => allowed.has(x as Syrup))
      : [];

  const cleaned: DrinkCustomizations = {};
  if (typeof sugar === "number") cleaned.sugar = sugar;
  if (syrups.length) cleaned.syrups = Array.from(new Set(syrups)) as Syrup[];

  return Object.keys(cleaned).length ? cleaned : null;
}

export function customizationsKey(custom: DrinkCustomizations | null | undefined): string {
  const normalized = normalizeCustomizations(custom);
  if (!normalized) return "base";
  const sugar = typeof normalized.sugar === "number" ? normalized.sugar : "";
  const syrups = normalized.syrups ? [...normalized.syrups].sort().join(",") : "";
  return `s${sugar}|y${syrups}`;
}

export function formatCustomizations(custom: unknown): string {
  const normalized = normalizeCustomizations(custom);
  if (!normalized) return "";
  const parts: string[] = [];
  if (typeof normalized.sugar === "number") parts.push(`Sugar: ${normalized.sugar}`);
  if (normalized.syrups?.length) parts.push(`Syrup: ${normalized.syrups.join(", ")}`);
  return parts.join(" • ");
}
