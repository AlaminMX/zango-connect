/**
 * wishlist.ts — localStorage-backed wishlist (no account required).
 * Stores product snapshots so the wishlist page renders offline and
 * survives later product edits.
 */
import { useEffect, useState, useSyncExternalStore } from "react";

const KEY = "sutura_wishlist";

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  seller_id: string;
  seller_name?: string;
  seller_city?: string;
  seller_slug?: string;
  whatsapp_number: string;
  stock_status?: string;
  savedAt: number;
}

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function read(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: WishlistItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  emit();
}

export function getWishlist(): WishlistItem[] {
  return read();
}

export function isWishlisted(id: string): boolean {
  return read().some((i) => i.id === id);
}

export function toggleWishlist(item: Omit<WishlistItem, "savedAt">): boolean {
  const items = read();
  const existing = items.findIndex((i) => i.id === item.id);
  if (existing >= 0) {
    items.splice(existing, 1);
    write(items);
    return false;
  }
  items.unshift({ ...item, savedAt: Date.now() });
  write(items);
  return true;
}

export function removeFromWishlist(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function clearWishlist() {
  write([]);
}

// Cross-tab sync via storage event
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) emit();
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

let lastRaw = "";
let snapshotCache: WishlistItem[] = [];

export function useWishlist(): WishlistItem[] {
  const items = useSyncExternalStore(
    subscribe,
    () => {
      if (typeof window === "undefined") return snapshotCache;
      const raw = localStorage.getItem(KEY) ?? "[]";
      if (raw !== lastRaw) {
        lastRaw = raw;
        try {
          const parsed = JSON.parse(raw);
          snapshotCache = Array.isArray(parsed) ? parsed : [];
        } catch {
          snapshotCache = [];
        }
      }
      return snapshotCache;
    },
    () => [] as WishlistItem[],
  );
  return items;
}

export function useWishlistCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(read().length);
    update();
    return subscribe(update);
  }, []);
  return count;
}

export function useIsWishlisted(id: string): boolean {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const update = () => setSaved(isWishlisted(id));
    update();
    return subscribe(update);
  }, [id]);
  return saved;
}
