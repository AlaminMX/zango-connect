/**
 * cityFilter.ts
 * A tiny in-memory event bus + localStorage persistence so the city selector
 * in TopBar stays in sync with every page that reads the filter.
 *
 * Usage:
 *   const { city, setCity } = useCityFilter();
 */

import { useState, useEffect } from "react";

const STORAGE_KEY = "sutura-city-filter";
export const ALL_CITIES = "All cities";

// ── in-memory pub/sub so React components re-render across the tree ──
const listeners = new Set<(city: string) => void>();

function broadcastCity(city: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, city);
  }
  listeners.forEach((fn) => fn(city));
}

function readStoredCity(): string {
  if (typeof window === "undefined") return ALL_CITIES;
  return localStorage.getItem(STORAGE_KEY) ?? ALL_CITIES;
}

export function useCityFilter() {
  const [city, _setCity] = useState<string>(readStoredCity);

  useEffect(() => {
    // Keep in sync when another component changes the city
    listeners.add(_setCity);
    return () => { listeners.delete(_setCity); };
  }, []);

  return {
    city,
    setCity: broadcastCity,
  };
}
