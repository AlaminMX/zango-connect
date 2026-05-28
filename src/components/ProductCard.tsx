import { buildWhatsAppUrl, trackClick } from "@/lib/whatsapp";
import { MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";

export interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  seller_id: string;
  seller_name?: string;
  seller_city?: string;
  seller_slug?: string;
  whatsapp_number: string;
  stock_status?: "available" | "low_stock" | "sold_out" | string;
}

export function ProductCard(p: ProductCardProps) {
  const url = buildWhatsAppUrl(p.whatsapp_number, p.name);
  const soldOut = p.stock_status === "sold_out";
  const low = p.stock_status === "low_stock";

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-warm transition hover:-translate-y-0.5 hover:shadow-warm-lg">
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} loading="lazy" className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${soldOut ? "opacity-50 grayscale" : ""}`} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>
        )}
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-foreground/85 px-2 py-0.5 text-[10px] font-medium text-background">
            Sold out
          </span>
        )}
        {low && (
          <span className="absolute left-2 top-2 rounded-full bg-accent/90 px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
            Low stock
          </span>
        )}
      </div>
      <div className="p-3">
        <h4 className="line-clamp-1 font-medium">{p.name}</h4>
        <p className="mt-0.5 font-serif text-lg text-primary">₦{Number(p.price).toLocaleString()}</p>
        {(p.seller_name || p.seller_city) && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {p.seller_slug ? (
              <Link to="/store/$slug" params={{ slug: p.seller_slug }} className="hover:text-primary hover:underline">
                {p.seller_name}
              </Link>
            ) : p.seller_name}
            {p.seller_name && p.seller_city ? " · " : ""}{p.seller_city}
          </p>
        )}
        {soldOut ? (
          <div className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
            Sold out
          </div>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClick(p.seller_id, p.id)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--color-whatsapp)] px-3 py-2 text-sm font-medium text-[var(--color-whatsapp-foreground)] transition hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" /> Order on WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
