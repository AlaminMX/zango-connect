import * as React from "react";
import { Share2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ProductShareCard } from "@/components/product-share-card/ProductShareCard";
import { downloadProductShareCard, nativeShareProductCard, canNativeShareImage, PRODUCT_SHARE_CARD_WIDTH } from "@/lib/product-share-card/export";
import type { ProductShareCardProduct, ProductShareCardVendor } from "@/lib/product-share-card/types";

interface Props {
  product: ProductShareCardProduct;
  vendor: ProductShareCardVendor;
}

const PREVIEW_MAX = 340;

export function ProductShareDialog({ product, vendor }: Props) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const scale = PREVIEW_MAX / PRODUCT_SHARE_CARD_WIDTH;
  const canShare = React.useMemo(() => canNativeShareImage(), []);

  const filename = `zango-${(product.name || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;

  const handleShare = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      await nativeShareProductCard({ node: cardRef.current, filename }, `${product.name} — on ZANGO`);
    } catch (error: any) {
      // AbortError = user cancelled the share sheet, not a failure.
      if (error?.name !== "AbortError") {
        toast.error("Could not open the share sheet", { description: "Try downloading the image instead." });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      await downloadProductShareCard({ node: cardRef.current, filename });
      toast.success("Card downloaded");
    } catch (error) {
      console.error(error);
      toast.error("Could not generate the card", { description: "Check image permissions or try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-border-warm bg-card px-5 text-sm font-medium text-espresso transition hover:border-primary"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Share this product</DialogTitle></DialogHeader>

        <div className="flex justify-center overflow-hidden rounded-3xl bg-[#2A1B16] p-4">
          <div style={{ width: PRODUCT_SHARE_CARD_WIDTH * scale, height: PRODUCT_SHARE_CARD_WIDTH * scale }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <ProductShareCard ref={cardRef} product={product} vendor={vendor} />
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">Instagram-ready square · {PRODUCT_SHARE_CARD_WIDTH}×{PRODUCT_SHARE_CARD_WIDTH}px</p>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {canShare && (
            <Button disabled={busy} onClick={handleShare} className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing…</> : <><Share2 className="mr-2 h-4 w-4" /> Share to Instagram, WhatsApp…</>}
            </Button>
          )}
          <Button disabled={busy} variant="outline" onClick={handleDownload} className="w-full rounded-full">
            {busy && !canShare ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Downloading…</> : <><Download className="mr-2 h-4 w-4" /> Download image</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
