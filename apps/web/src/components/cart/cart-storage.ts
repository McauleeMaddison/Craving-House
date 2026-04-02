export type CartLine = {
  id: string;
  itemId: string;
  qty: number;
  customizations?: unknown;
};

type CartStorageTarget = {
  key: string;
  scope: "local" | "session";
};

const GUEST_KEY = "craving-house.cart.guest.v1";
const USER_KEY_PREFIX = "craving-house.cart.user";
const LEGACY_KEY = "craving-house.cart.v1";

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

function getStorage(scope: CartStorageTarget["scope"]) {
  return scope === "local" ? window.localStorage : window.sessionStorage;
}

export function getGuestCartStorage(): CartStorageTarget {
  return {
    key: GUEST_KEY,
    scope: "session"
  };
}

export function getUserCartStorage(userId: string): CartStorageTarget {
  return {
    key: `${USER_KEY_PREFIX}.${userId}.v1`,
    scope: "local"
  };
}

export function loadCart(target: CartStorageTarget): CartLine[] {
  if (typeof window === "undefined") return [];
  if (target.scope === "session" && target.key === GUEST_KEY) {
    window.localStorage.removeItem(LEGACY_KEY);
  }
  return safeParse(getStorage(target.scope).getItem(target.key));
}

export function saveCart(lines: CartLine[], target: CartStorageTarget) {
  if (typeof window === "undefined") return;
  getStorage(target.scope).setItem(target.key, JSON.stringify(lines));
}
