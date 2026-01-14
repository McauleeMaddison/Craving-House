export function calculatePrepSeconds(params: {
  baseSeconds?: number;
  items: Array<{ qty: number; prepSeconds: number }>;
}): number {
  const baseSeconds = params.baseSeconds ?? 0;
  const base = Number.isFinite(baseSeconds) && baseSeconds > 0 ? baseSeconds : 0;

  const itemsSeconds = params.items.reduce((sum, item) => {
    const qty = Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 0;
    const prepSeconds =
      Number.isFinite(item.prepSeconds) && item.prepSeconds > 0 ? item.prepSeconds : 0;
    return sum + qty * prepSeconds;
  }, 0);

  return base + itemsSeconds;
}

