import { buildWhatsAppUrl, trackClick } from "@/lib/whatsapp";
import { MessageCircle } from "lucide-react";

export interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  seller_id: string;
  seller_name?: string;
  whatsapp_number: string;
}

export function ProductCard(p: ProductCardProps) {
  const url = buildWhatsAppUrl(p.whatsapp_number, p.name);
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-warm">
      <div className="aspect-square w-full overflow-hidden bg-muted">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">No image</div>
        )}
      </div>
      <div className="p-3">
        <h4 className="line-clamp-1 font-medium">{p.name}</h4>
        <p className="mt-0.5 font-serif text-lg text-primary">₦{Number(p.price).toLocaleString()}</p>
        {p.seller_name && <p className="mt-0.5 text-xs text-muted-foreground">{p.seller_name}</p>}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick(p.seller_id, p.id)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--color-whatsapp)] px-3 py-2 text-sm font-medium text-[var(--color-whatsapp-foreground)] transition hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> Order on WhatsApp
        </a>
      </div>
    </div>
  );
}
