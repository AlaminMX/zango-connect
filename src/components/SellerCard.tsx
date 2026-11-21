import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin, Star } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { cardInitials } from "@/components/marketing-card/MarketingCard";

export interface SellerCardProps {
  slug: string;
  business_name: string;
  category?: string | null;
  city?: string | null;
  profile_photo_url?: string | null;
  is_verified?: boolean | null;
  rating?: number | null;
}

function SellerCardContent(s: SellerCardProps) {
  return (
    <Link
      to="/store/$slug"
      params={{ slug: s.slug }}
      className="group flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border-warm bg-card p-4 transition hover:border-primary/60 hover:shadow-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/10 font-display text-lg font-bold text-primary">
          {s.profile_photo_url ? (
            <img
              src={s.profile_photo_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            cardInitials(s.business_name)
          )}
        </div>
        {s.rating != null && Number.isFinite(s.rating) && (
          <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Star aria-hidden className="size-3.5 fill-current text-primary" />
            {s.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <h3 className="line-clamp-2 break-words font-display text-xl leading-tight text-foreground">
            {s.business_name}
          </h3>
          {s.is_verified && <VerifiedBadge className="mt-1 size-4 shrink-0" />}
        </div>
        {s.category && <p className="mt-1 truncate text-sm text-muted-foreground">{s.category}</p>}
        {s.city && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">{s.city}</span>
          </p>
        )}
      </div>
      <span className="flex items-center justify-between gap-2 border-t border-border-warm pt-3 text-sm font-semibold text-primary">
        View store{" "}
        <ArrowUpRight
          aria-hidden
          className="size-4 shrink-0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}

export const SellerCard = memo(SellerCardContent);
