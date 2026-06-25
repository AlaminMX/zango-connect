import React, { createContext, useContext, useState, useEffect } from "react";
import { listActiveCities } from "@/lib/cities.functions";

const STORAGE_KEY = "sutura-selected-city";

export interface CityOption {
  id: string;
  name: string;
  state: string;
  slug: string;
}

interface CityContextValue {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  /** Admin-managed cities from DB, ready for the TopBar dropdown */
  activeCities: CityOption[];
  citiesLoading: boolean;
}

const CityContext = createContext<CityContextValue>({
  selectedCity: "All",
  setSelectedCity: () => {},
  activeCities: [],
  citiesLoading: true,
});

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [selectedCity, setSelectedCityState] = useState<string>("All");
  const [activeCities, setActiveCities] = useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  // Restore persisted selection
  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setSelectedCityState(stored);
  }, []);

  // Fetch admin-managed cities from DB
  useEffect(() => {
    let cancelled = false;
    listActiveCities()
      .then((data) => {
        if (!cancelled) {
          setActiveCities(
            data.map((c) => ({ id: c.id, name: c.name, state: c.state, slug: c.slug }))
          );
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setCitiesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const setSelectedCity = (city: string) => {
    setSelectedCityState(city);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, city);
  };

  return (
    <CityContext.Provider value={{ selectedCity, setSelectedCity, activeCities, citiesLoading }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() { return useContext(CityContext); }
