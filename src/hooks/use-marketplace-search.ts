import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSearchSuggestions, searchMarketplace, SEARCH_DEBOUNCE_MS, type MarketplaceSearchParams } from "@/lib/marketplace-search";

export function useDebouncedValue<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useMarketplaceSearch(params: Omit<MarketplaceSearchParams, "signal">) {
  const debouncedQuery = useDebouncedValue(params.query);
  const normalizedParams = useMemo(() => ({ ...params, query: debouncedQuery.trim() }), [params, debouncedQuery]);

  return useQuery({
    queryKey: ["marketplace-search", normalizedParams],
    enabled: normalizedParams.query.length > 0,
    queryFn: ({ signal }) => searchMarketplace({ ...normalizedParams, signal }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export function useSearchSuggestions(query: string) {
  const debouncedQuery = useDebouncedValue(query, 200);
  return useQuery({
    queryKey: ["marketplace-search-suggestions", debouncedQuery.trim()],
    enabled: debouncedQuery.trim().length >= 2,
    queryFn: ({ signal }) => getSearchSuggestions(debouncedQuery, signal),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
