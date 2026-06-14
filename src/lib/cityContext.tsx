/**
 * cityContext.tsx
 * Global city/state selection that persists to localStorage.
 * Used by TopBar, index, products, sellers, and search pages.
 */
import React, { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "sutura-selected-city";

interface CityContextValue {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
}

const CityContext = createContext<CityContextValue>({
  selectedCity: "All",
  setSelectedCity: () => {},
});

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [selectedCity, setSelectedCityState] = useState<string>("All");

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setSelectedCityState(stored);
  }, []);

  const setSelectedCity = (city: string) => {
    setSelectedCityState(city);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, city);
    }
  };

  return (
    <CityContext.Provider value={{ selectedCity, setSelectedCity }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  return useContext(CityContext);
}
