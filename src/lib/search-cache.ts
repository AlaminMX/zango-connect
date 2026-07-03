/**
 * Search caching and performance utilities
 * Implements client-side caching and debouncing for improved performance
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

/**
 * Simple in-memory cache with TTL (Time To Live)
 * Useful for caching search results and metadata
 */
export class TTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl: number; // milliseconds

  constructor(ttlSeconds: number = 300) {
    this.ttl = ttlSeconds * 1000;
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Debounce function - delays execution until stops being called
 * Great for search input to avoid too many requests
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Throttle function - executes at most once per interval
 * Useful for scroll or resize listeners
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs: number,
): (...args: Parameters<T>) => void {
  let lastRun = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRun >= intervalMs) {
      fn(...args);
      lastRun = now;
    }
  };
}

/**
 * Local storage wrapper with type safety
 * Handles serialization and JSON parsing
 */
export const LocalStorage = {
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[v0] LocalStorage.set(${key}) error:`, error);
    }
  },

  get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`[v0] LocalStorage.get(${key}) error:`, error);
      return defaultValue;
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[v0] LocalStorage.remove(${key}) error:`, error);
    }
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error("[v0] LocalStorage.clear() error:", error);
    }
  },
};

/**
 * Session storage wrapper for temporary data
 */
export const SessionStorage = {
  set<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[v0] SessionStorage.set(${key}) error:`, error);
    }
  },

  get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return defaultValue;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`[v0] SessionStorage.get(${key}) error:`, error);
      return defaultValue;
    }
  },

  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error(`[v0] SessionStorage.remove(${key}) error:`, error);
    }
  },

  clear(): void {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error("[v0] SessionStorage.clear() error:", error);
    }
  },
};

/**
 * Global search cache instance (5 minute TTL)
 */
export const searchCache = new TTLCache<any>(300);

/**
 * Batch requests to reduce API calls
 * Useful for loading multiple products
 */
export class BatchQueue<T, R> {
  private queue: T[] = [];
  private processing = false;
  private flushTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private maxBatchSize: number;
  private flushDelayMs: number;
  private processor: (items: T[]) => Promise<R[]>;

  constructor(
    processor: (items: T[]) => Promise<R[]>,
    maxBatchSize: number = 100,
    flushDelayMs: number = 100,
  ) {
    this.processor = processor;
    this.maxBatchSize = maxBatchSize;
    this.flushDelayMs = flushDelayMs;
  }

  add(item: T): void {
    this.queue.push(item);

    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    } else if (!this.flushTimeoutId) {
      // Schedule a flush if not already scheduled
      this.flushTimeoutId = setTimeout(() => {
        this.flush();
      }, this.flushDelayMs);
    }
  }

  async flush(): Promise<R[]> {
    if (this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId);
      this.flushTimeoutId = null;
    }

    if (this.queue.length === 0) return [];

    this.processing = true;
    try {
      const items = this.queue.splice(0, this.queue.length);
      const results = await this.processor(items);
      return results;
    } finally {
      this.processing = false;
    }
  }

  pending(): number {
    return this.queue.length;
  }

  isProcessing(): boolean {
    return this.processing;
  }
}

/**
 * Measure performance of a function
 * Useful for debugging slow operations
 */
export async function measurePerformance<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`[v0] ${label}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[v0] ${label}: ${duration.toFixed(2)}ms (error)`, error);
    throw error;
  }
}

/**
 * Memoize function results
 * Useful for expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(fn: T, maxSize: number = 100): T {
  const cache = new Map<string, any>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);

    // Simple LRU: remove oldest when full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  }) as T;
}
