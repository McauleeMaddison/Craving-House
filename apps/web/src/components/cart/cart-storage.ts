export type CartLine = {
  id: string;
  itemId: string;
  qty: number;
  customizations?: unknown;
};

const KEY = "craving-house.cart.v1";

function safeParse(json: string | null): CartLine[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => {
        const itemId = typeof (x as any)?.itemId === "string" ? (x as any).itemId : "";
        const qty = Number.isFinite((x as any)?.qty) ? Number((x as any).qty) : 0;
        const customizations = (x as any)?.customizations;
        const id =
          typeof (x as any)?.id === "string" ? (x as any).id : itemId ? `${itemId}:base` : "";
        return { id, itemId, qty, customizations };
      })
      .filter((x) => x.id && x.itemId && x.qty > 0);
  } catch {
    return [];
  }
}

export function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY));
}

export function saveCart(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(lines));
}
