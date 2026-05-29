import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  /** Fallback route if there's no browser history (default: "/") */
  fallback?: string;
  className?: string;
}

/**
 * Mobile-first back navigation button.
 * Uses browser history when available; falls back to a route.
 */
export function BackButton({ fallback = "/", className = "" }: BackButtonProps) {
  const nav = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      nav({ to: fallback });
    }
  };

  return (
    <button
      onClick={handleBack}
      aria-label="Go back"
      className={[
        // Container — 44 × 44 tap target (Apple HIG minimum)
        "group inline-flex h-11 w-11 items-center justify-center",
        "rounded-full border border-border/60 bg-card shadow-warm",
        "transition-all duration-150",
        "hover:bg-secondary hover:border-primary/20 hover:shadow-warm-lg",
        "active:scale-95",
        className,
      ].join(" ")}
    >
      <ArrowLeft
        className="h-5 w-5 text-foreground/70 transition-transform duration-150 group-hover:-translate-x-0.5 group-hover:text-primary"
        strokeWidth={2}
      />
    </button>
  );
}
