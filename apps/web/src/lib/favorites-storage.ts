const FAVORITES_KEY = "craving-house.menu.favorites.v1";
const FAVORITES_EVENT = "ch:favorites:updated";

function readRawFavorites() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  } catch {
    return [];
  }
}

function writeRawFavorites(favorites: string[]) {
  if (typeof window === "undefined") return;
  const unique = Array.from(new Set(favorites.map((value) => value.trim()).filter(Boolean)));
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(unique));
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

export function getFavoriteProductIds() {
  return readRawFavorites();
}

export function isFavoriteProduct(productId: string) {
  if (!productId) return false;
  return readRawFavorites().includes(productId);
}

export function toggleFavoriteProduct(productId: string) {
  if (!productId) return [];
  const current = readRawFavorites();
  const next = current.includes(productId) ? current.filter((value) => value !== productId) : [...current, productId];
  writeRawFavorites(next);
  return next;
}

export function onFavoritesUpdated(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === FAVORITES_KEY) listener();
  };
  const onLocalEvent = () => listener();

  window.addEventListener("storage", onStorage);
  window.addEventListener(FAVORITES_EVENT, onLocalEvent);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(FAVORITES_EVENT, onLocalEvent);
  };
}
