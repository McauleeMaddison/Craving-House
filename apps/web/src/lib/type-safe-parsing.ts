/**
 * Type-safe JSON parsing helpers
 * Use these instead of "as any" when parsing external data
 */

/**
 * Type guard: safely parse a string to a specific type
 * 
 * Before (unsafe):
 *   const data = JSON.parse(json) as any;
 * 
 * After (safe):
 *   const data = safeJsonParse(json, isValidCartLine);
 *   if (!data) return []; // Type-safe fallback
 */
export function safeJsonParse<T>(
  json: string | null | undefined,
  typeGuard: (x: unknown) => x is T,
  fallback: T | T[] = []
): T | T[] {
  if (!json) return fallback;
  
  try {
    const parsed = JSON.parse(json) as unknown;
    
    // Single item
    if (typeGuard(parsed)) {
      return parsed;
    }
    
    // Array of items
    if (Array.isArray(parsed)) {
      return parsed.filter(typeGuard) as T[];
    }
    
    // Invalid format
    return fallback;
  } catch (error) {
    // JSON parse error - return fallback
    return fallback;
  }
}

/**
 * Type guard for cart items
 * Define exactly what a valid cart line looks like
 */
export type CartLine = {
  id: string;
  itemId: string;
  qty: number;
  customizations?: unknown;
};

export function isValidCartLine(x: unknown): x is CartLine {
  if (typeof x !== "object" || x === null) return false;
  
  const item = x as Record<string, unknown>;
  
  // Required fields with correct types
  if (typeof item.id !== "string") return false;
  if (typeof item.itemId !== "string") return false;
  if (typeof item.qty !== "number" || !Number.isFinite(item.qty)) return false;
  
  // Optional fields are allowed
  // customizations can be anything or undefined
  
  return true;
}

/**
 * Parse cart data from localStorage safely
 * Before (unsafe):
 *   const cart = JSON.parse(localStorage.getItem("cart")) as any;
 * 
 * After (safe):
 *   const cart = parseCartFromStorage(localStorage.getItem("cart"));
 */
export function parseCartFromStorage(json: string | null): CartLine[] {
  return safeJsonParse(json, isValidCartLine, []) as CartLine[];
}

// ============================================
// ORDER LINE ITEM TYPE
// ============================================

export type OrderLineItem = {
  productId: string;
  qty: number;
  customizations?: unknown;
};

export function isValidOrderLineItem(x: unknown): x is OrderLineItem {
  if (typeof x !== "object" || x === null) return false;
  
  const item = x as Record<string, unknown>;
  
  if (typeof item.productId !== "string") return false;
  if (typeof item.qty !== "number" || !Number.isFinite(item.qty) || item.qty <= 0) return false;
  
  return true;
}

export function parseOrderLines(raw: unknown): OrderLineItem[] {
  if (!Array.isArray(raw)) return [];
  
  return raw
    .filter(isValidOrderLineItem)
    .map((item) => ({
      productId: (item as OrderLineItem).productId,
      qty: (item as OrderLineItem).qty,
      customizations: (item as OrderLineItem).customizations
    }));
}

// ============================================
// STRIPE WEBHOOK TYPES
// ============================================

export type StripeEventType = "payment_intent.succeeded" | "payment_intent.payment_failed" | "charge.refunded" | string;

export type StripeEvent = {
  id: string;
  object: "event";
  type: StripeEventType;
  created: number;
  data: {
    object: Record<string, unknown>;
    previous_attributes?: Record<string, unknown>;
  };
};

export function isValidStripeEvent(x: unknown): x is StripeEvent {
  if (typeof x !== "object" || x === null) return false;
  
  const event = x as Record<string, unknown>;
  
  if (typeof event.id !== "string") return false;
  if (event.object !== "event") return false;
  if (typeof event.type !== "string") return false;
  if (typeof event.created !== "number") return false;
  if (!event.data || typeof event.data !== "object") return false;
  
  const data = event.data as Record<string, unknown>;
  if (!data.object || typeof data.object !== "object") return false;
  
  return true;
}

// ============================================
// GENERIC SAFE PARSING
// ============================================

/**
 * Parse nested object properties safely
 * Prevents errors when accessing deep properties
 * 
 * Before:
 *   const email = (user as any)?.profile?.email || "";
 * 
 * After:
 *   const email = safeGet(user, ["profile", "email"], "");
 */
export function safeGet<T = unknown>(
  obj: unknown,
  path: string[],
  defaultValue: T
): T {
  let current: any = obj;
  
  for (const key of path) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    if (typeof current !== "object") {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return current ?? defaultValue;
}

/**
 * Convert unknown type safely with fallback
 */
export function safeString(value: unknown, defaultValue = ""): string {
  return typeof value === "string" ? value : defaultValue;
}

export function safeNumber(value: unknown, defaultValue = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
}

export function safeBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return defaultValue;
}
