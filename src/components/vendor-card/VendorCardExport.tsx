import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VendorCard } from "./VendorCard";
import { useVendorCardExport } from "./useVendorCardExport";
import { useResponsiveScale } from "./useResponsiveScale";
import type { VendorCardProps } from "./types";

const CARD_NATURAL_WIDTH = 1600;
const CARD_NATURAL_HEIGHT = 900;

interface VendorCardExportProps {
  vendor: VendorCardProps;
  /** Hide the built-in "Generate Share Card" button, e.g. if a parent renders its own trigger. */
  hideAction?: boolean;
}

/**
 * Renders the vendor card responsively (scaled to fit its container) and
 * wires up a "Generate Share Card" button that exports the untouched,
 * full-resolution 1600×900 canvas as a PNG.
 */
export function VendorCardExport({ vendor, hideAction }: VendorCardExportProps) {
  const { cardRef, isExporting, exportCard } = useVendorCardExport(vendor.businessName);
  const { containerRef, scale } = useResponsiveScale(CARD_NATURAL_WIDTH);

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Responsive stage — reserves the correct 16:9 height, clips the scaled card */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-[28px] aspect-[16/9]"
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `scale(${scale})` }}
        >
          <VendorCard ref={cardRef} {...vendor} />
        </div>
      </div>

      {!hideAction && (
        <Button
          onClick={exportCard}
          disabled={isExporting}
          size="lg"
          className="w-full self-center rounded-full bg-[#5B3A29] text-[#F8F4EF] hover:bg-[#4A2E1F] sm:w-auto sm:self-start"
        >
          {isExporting ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-4 w-4" />
          )}
          {isExporting ? "Generating…" : "Generate Share Card"}
        </Button>
      )}
    </div>
  );
}
