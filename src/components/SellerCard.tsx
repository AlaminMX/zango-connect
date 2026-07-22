import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Star } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export interface SellerCardProps {
  slug: string;
  business_name: string;
  category: string;
  city: string;
  profile_photo_url?: string | null;
  is_verified?: boolean;
  rating?: number;
}

function SellerCardContent(s: SellerCardProps) {
  return (
    <Link
      to="/store/$slug"
      params={{ slug: s.slug }}
      className="group block overflow-hidden rounded-3xl border border-border-warm bg-card transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-warm-lg"
    >
      <div className="flex items-start gap-3 p-4">
        <div className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-surface-warm ring-2 ${s.is_verified ? "ring-sage" : "ring-border-warm"}`}>
          {s.profile_photo_url ? (
            <img src={s.profile_photo_url} alt={s.business_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-xl text-primary">
              {s.business_name.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-lg leading-tight text-espresso">{s.business_name}</h3>
            {s.is_verified && <VerifiedBadge className="h-4 w-4" />}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.category}</p>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.city}</span>
            <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-sage text-sage" />{(s.rating ?? 5).toFixed(1)}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-border-warm bg-surface-warm/60 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-sage-deep group-hover:bg-surface-warm">
        View store →
      </div>
    </Link>
  );
}

export const SellerCard = memo(SellerCardContent);
