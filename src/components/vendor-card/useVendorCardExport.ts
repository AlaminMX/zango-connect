import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { slugify } from "@/lib/whatsapp";
import { CARD_HEIGHT, CARD_WIDTH, EXPORT_PIXEL_RATIO } from "./types";

/**
 * Captures the *unscaled* 1600×900 card node with html-to-image and triggers
 * a `BusinessName-Zango.png` download at 2x pixel density (3200×1800).
 *
 * Because `cardRef` always points at the native-size canvas — regardless of
 * how it's visually scaled down for responsive preview — the export is
 * pixel-perfect at every screen size.
 */
export function useVendorCardExport(businessName: string) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportCard = useCallback(async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        pixelRatio: EXPORT_PIXEL_RATIO,
        cacheBust: true,
        backgroundColor: "#F8F4EF",
      });

      const link = document.createElement("a");
      link.download = `${slugify(businessName) || "vendor"}-Zango.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Share card downloaded!");
    } catch (err) {
      console.error("[VendorCard] export failed:", err);
      toast.error("Couldn't generate the card. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [businessName]);

  return { cardRef, isExporting, exportCard };
}
