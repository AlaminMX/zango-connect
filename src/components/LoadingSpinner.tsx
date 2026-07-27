/**
 * LoadingSpinner.tsx
 * Lightweight, CSS-only loading animations — smooth & professional.
 * No external dependencies beyond Tailwind.
 */

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Spinning ring — for page/section loads                              */
/* ------------------------------------------------------------------ */
export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary",
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Full-page loader — centred spinner with subtle pulse                */
/* ------------------------------------------------------------------ */
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      {/* Animated logo-mark dots */}
      <div className="flex items-end gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-primary"
            style={{
              animation: `zango-bounce 1.1s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
      <p className="animate-pulse text-sm text-muted-foreground">{label}</p>

      {/* Keyframes injected inline so they work without a separate CSS file */}
      <style>{`
        @keyframes zango-bounce {
          0%, 80%, 100% { transform: translateY(0);   opacity: 0.4; }
          40%           { transform: translateY(-10px); opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline section loader — lighter spinner + text                      */
/* ------------------------------------------------------------------ */
export function SectionLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Spinner className="h-7 w-7" />
      <p className="animate-pulse text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product card skeleton                                                */
/* ------------------------------------------------------------------ */
export function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-warm">
      <div className="aspect-square w-full animate-pulse bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
        <div className="h-5 w-1/2 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded-md bg-muted" />
        <div className="mt-3 h-8 w-full animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Seller card skeleton                                                 */
/* ------------------------------------------------------------------ */
export function SellerSkeleton() {
  return (
    <div className="w-64 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-warm">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Category tile skeleton                                               */
/* ------------------------------------------------------------------ */
export function CategorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-[#F0DDD0] bg-white p-4">
      <div className="h-20 w-20 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Registration step transition overlay                                 */
/* ------------------------------------------------------------------ */
export function StepTransition({ label = "Saving…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="flex items-end gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-primary"
            style={{
              animation: `zango-bounce 1.1s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <style>{`
        @keyframes zango-bounce {
          0%, 80%, 100% { transform: translateY(0);   opacity: 0.4; }
          40%           { transform: translateY(-10px); opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
