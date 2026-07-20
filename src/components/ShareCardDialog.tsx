/**
 * ShareCardDialog — generates a beautiful, downloadable "business card" image
 * for a seller. Used in two places:
 *   1. store.$slug.tsx — owner generates their own card to post on Instagram/status.
 *   2. admin.tsx ("Cards" tab) — admin can view + download ANY seller's card.
 *
 * Rendered at a small on-screen size, exported at 3x pixel density via
 * html-to-image so the downloaded PNG is sharp (~1000x1300px).
 *
 * KNOWN RISK (flagged, not silently hidden): profile photos are fetched from
 * Supabase Storage. html-to-image inlines them via fetch() under the hood,
 * which requires the storage response to allow CORS. Supabase public buckets
 * send `Access-Control-Allow-Origin: *` by default, so this should work out
 * of the box — but if a custom CDN/proxy sits in front of storage without
 * that header, the photo will silently fail to render in the exported PNG
 * (it'll still show fine in the live preview). Test a real download before
 * relying on this for a campaign.
 */
import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, MessageCircle, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { normaliseNigerianPhone, slugify } from "@/lib/whatsapp";

export interface ShareCardSeller {
  business_name: string;
  slug: string;
  whatsapp_number: string;
  profile_photo_url: string | null;
  city: string;
  category: string;
}

interface ShareCardDialogProps {
  seller: ShareCardSeller;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ThemeKey = "terracotta" | "sage" | "espresso";

const THEMES: Record<ThemeKey, { label: string; swatch: string; bg: string; text: string; chip: string; accent: string }> = {
  terracotta: {
    label: "Terracotta",
    swatch: "#C05A3F",
    bg: "linear-gradient(135deg, #C05A3F 0%, #D87159 50%, #F0A878 100%)",
    text: "#FCF9F5",
    chip: "rgba(255,255,255,0.18)",
    accent: "#FCF9F5",
  },
  sage: {
    label: "Sage",
    swatch: "#7A8A4B",
    bg: "linear-gradient(135deg, #54622F 0%, #7A8A4B 50%, #B9C68A 100%)",
    text: "#FCF9F5",
    chip: "rgba(255,255,255,0.2)",
    accent: "#FCF9F5",
  },
  espresso: {
    label: "Espresso",
    swatch: "#3E2723",
    bg: "linear-gradient(135deg, #1F1410 0%, #3E2723 50%, #6B4A3D 100%)",
    text: "#FCF9F5",
    chip: "rgba(255,255,255,0.14)",
    accent: "#D87159",
  },
};

export function ShareCardDialog({ seller, open, onOpenChange }: ShareCardDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<ThemeKey>("terracotta");
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const t = THEMES[theme];
  const initial = seller.business_name.trim().charAt(0).toUpperCase() || "S";
  const displayPhone = normaliseNigerianPhone(seller.whatsapp_number);
  const phoneText = displayPhone ? `+${displayPhone}` : seller.whatsapp_number;
  const fullStoreUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/store/${seller.slug}`
      : `https://sutura-connect.lovable.app/store/${seller.slug}`;
  const storeUrl =
    typeof window !== "undefined"
      ? `${window.location.host}/store/${seller.slug}`
      : `sutura-connect.lovable.app/store/${seller.slug}`;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `${slugify(seller.business_name)}-sutura-card.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Card downloaded!");
    } catch (err) {
      console.error("[ShareCardDialog] export failed:", err);
      toast.error("Couldn't generate the image — please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });

      // Convert data URL to File
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${slugify(seller.business_name)}-sutura-card.png`, { type: "image/png" });

      const shareText = `Check out ${seller.business_name} on Sutura Market! ${fullStoreUrl}`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText, url: fullStoreUrl });
      } else {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: unknown) {
      // User cancelled share — not an error worth surfacing
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("[ShareCardDialog] share failed:", err);
      // Fallback to WhatsApp link
      const shareText = `Check out ${seller.business_name} on Sutura Market! ${fullStoreUrl}`;
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Your shareable card</DialogTitle>
        </DialogHeader>

        <p className="-mt-2 text-xs text-muted-foreground">
          Pick a style, then download and post it to your WhatsApp status or Instagram.
        </p>

        {/* Theme picker */}
        <div className="flex items-center gap-2">
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTheme(key)}
              aria-label={`${THEMES[key].label} theme`}
              aria-pressed={theme === key}
              className={`h-8 w-8 shrink-0 rounded-full ring-offset-2 transition ${
                theme === key ? "ring-2 ring-primary" : "ring-1 ring-border-warm hover:ring-primary/40"
              }`}
              style={{ background: THEMES[key].swatch }}
            />
          ))}
          <span className="ml-1 text-xs font-medium text-muted-foreground">{t.label}</span>
        </div>

        {/* Card preview — this exact node is exported as the PNG */}
        <div className="flex justify-center py-1">
          <a
            href={fullStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${seller.business_name}'s store`}
            className="block rounded-[28px] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
          <div
            ref={cardRef}
            className="relative flex w-[300px] flex-col overflow-hidden rounded-[28px] p-6"
            style={{ aspectRatio: "4 / 5", background: t.bg }}
          >
            {/* Decorative ring accents */}
            <div
              className="absolute -right-12 -top-12 h-40 w-40 rounded-full"
              style={{ background: "rgba(255,255,255,0.12)" }}
            />
            <div
              className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full"
              style={{ background: "rgba(0,0,0,0.08)" }}
            />

            {/* Profile photo */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div
                className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full ring-4"
                style={{ background: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.5)" } as React.CSSProperties}
              >
                {seller.profile_photo_url ? (
                  <img
                    src={seller.profile_photo_url}
                    alt={seller.business_name}
                    crossOrigin="anonymous"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-display text-4xl" style={{ color: t.accent }}>{initial}</span>
                )}
              </div>

              <h3 className="mt-4 font-display text-2xl leading-tight" style={{ color: t.text }}>
                {seller.business_name}
              </h3>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider" style={{ color: t.text, opacity: 0.8 }}>
                {seller.category} · {seller.city}
              </p>
            </div>

            {/* Info chips */}
            <div className="relative z-10 mt-6 flex flex-1 flex-col justify-center gap-2.5">
              <div
                className="flex items-center gap-2 rounded-full px-3.5 py-2"
                style={{ background: t.chip }}
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0" style={{ color: t.text }} />
                <span className="truncate text-xs font-medium" style={{ color: t.text }}>{phoneText}</span>
              </div>
              <div
                className="flex items-center gap-2 rounded-full px-3.5 py-2"
                style={{ background: t.chip }}
              >
                <Link2 className="h-3.5 w-3.5 shrink-0" style={{ color: t.text }} />
                <span className="truncate text-xs font-medium" style={{ color: t.text }}>{storeUrl}</span>
              </div>
            </div>

            {/* Branding watermark */}
            <div className="relative z-10 mt-4 flex items-center justify-center gap-1.5 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.25)" }}>
              <img src="/zango-logo.png" alt="" className="h-5 w-5 object-contain" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: t.text, opacity: 0.85 }}>
                Sutura Market
              </span>
            </div>
          </div>
          </a>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleDownload} disabled={downloading || sharing} className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
            {downloading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
            {downloading ? "Generating…" : "Download"}
          </Button>
          <Button onClick={handleShareWhatsApp} disabled={downloading || sharing} variant="outline" className="flex-1 rounded-full border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10">
            {sharing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Share2 className="mr-1.5 h-4 w-4" />}
            {sharing ? "Sharing…" : "WhatsApp"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
