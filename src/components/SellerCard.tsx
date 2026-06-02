import { Link } from "@tanstack/react-router";
import { MapPin, Star } from "lucide-react";

export interface SellerCardProps {
  slug: string;
  business_name: string;
  category: string;
  city: string;
  profile_photo_url?: string | null;
  is_verified?: boolean;
  rating?: number;
}

export function SellerCard(s: SellerCardProps) {
  return (
    <Link
      to="/store/$slug"
      params={{ slug: s.slug }}
      className="group block overflow-hidden rounded-2xl border border-border/60 bg-card shadow-warm transition hover:-translate-y-0.5 hover:shadow-warm-lg"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-secondary">
          {s.profile_photo_url ? (
            <img src={s.profile_photo_url} alt={s.business_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-serif text-xl text-primary">
              {s.business_name.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-serif text-lg font-semibold leading-tight">{s.business_name}</h3>
            {s.is_verified && (
              /* Gold verification badge — earned via 5 verified-seller vouches */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4 shrink-0 text-amber-500"
                aria-label="Verified seller"
              >
                <path
                  fillRule="evenodd"
                  d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.category}</p>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.city}</span>
            <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" />{(s.rating ?? 5).toFixed(1)}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-border/50 bg-muted/40 px-4 py-2.5 text-center text-xs font-medium text-primary group-hover:bg-muted/70">
        View Store →
      </div>
    </Link>
  );
}
