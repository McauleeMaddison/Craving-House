import type { MenuItem } from "@/lib/sample-data";

export type OrderStatus = "received" | "accepted" | "ready" | "collected" | "canceled";

export type OrderLine = {
  itemId: string;
  name: string;
  unitPriceCents: number;
  qty: number;
  prepSeconds: number;
  loyaltyEligible: boolean;
};

export type Order = {
  id: string;
  createdAtIso: string;
  status: OrderStatus;
  pickupName: string;
  notes?: string;
  payInStore: true;
  subtotalCents: number;
  estimatedReadyAtIso: string;
  lines: OrderLine[];
};

const KEY = "craving-house.orders.v1";

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function safeParse(json: string | null): Order[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Order[];
  } catch {
    return [];
  }
}

export function loadOrders(): Order[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY));
}

export function saveOrders(orders: Order[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(orders));
}

export function createOrder(params: {
  pickupName: string;
  notes?: string;
  baseSeconds: number;
  items: Array<{ item: MenuItem; qty: number }>;
}): Order {
  const createdAt = new Date();
  const subtotalCents = params.items.reduce((sum, x) => sum + x.qty * x.item.priceCents, 0);
  const totalPrepSeconds =
    Math.max(0, params.baseSeconds) +
    params.items.reduce((sum, x) => sum + x.qty * Math.max(0, x.item.prepSeconds), 0);
  const estimatedReadyAt = new Date(createdAt.getTime() + totalPrepSeconds * 1000);

  const lines: OrderLine[] = params.items.map(({ item, qty }) => ({
    itemId: item.id,
    name: item.name,
    unitPriceCents: item.priceCents,
    qty,
    prepSeconds: item.prepSeconds,
    loyaltyEligible: item.loyaltyEligible
  }));

  return {
    id: randomId("order"),
    createdAtIso: createdAt.toISOString(),
    status: "received",
    pickupName: params.pickupName.trim(),
    notes: params.notes?.trim() || undefined,
    payInStore: true,
    subtotalCents,
    estimatedReadyAtIso: estimatedReadyAt.toISOString(),
    lines
  };
}

export function upsertOrder(order: Order) {
  const existing = loadOrders();
  const idx = existing.findIndex((o) => o.id === order.id);
  const next = [...existing];
  if (idx >= 0) next[idx] = order;
  else next.unshift(order);
  saveOrders(next);
}

export function updateOrderStatus(params: { orderId: string; status: OrderStatus }) {
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === params.orderId);
  if (idx < 0) return;
  orders[idx] = { ...orders[idx], status: params.status };
  saveOrders(orders);
}

