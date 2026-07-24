import * as React from "react";
import { Download, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VendorCard } from "@/components/vendor-card/VendorCard";
import { downloadVendorCard } from "@/lib/vendor-card/export";
import { resolveVendorCardTheme, vendorCardFormats, vendorCardThemes } from "@/lib/vendor-card/themes";
import type { VendorCardFormat, VendorCardProduct, VendorCardThemeName, VendorCardVendor } from "@/lib/vendor-card/types";

export function VendorCardStudio({ vendor, products, canRegenerate = false }: { vendor: VendorCardVendor; products: VendorCardProduct[]; canRegenerate?: boolean }) {
  const [format, setFormat] = React.useState<VendorCardFormat>("instagram-portrait");
  const [theme, setTheme] = React.useState<VendorCardThemeName>(() => resolveVendorCardTheme(vendor.category).name);
  const [isExporting, setIsExporting] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const dimensions = vendorCardFormats[format];
  const scale = Math.min(1, 860 / dimensions.width);

  const exportCard = async (targetFormat = format) => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      await downloadVendorCard(cardRef.current, vendor.slug, targetFormat);
      toast.success("Vendor card downloaded", { description: vendorCardFormats[targetFormat].label });
    } catch (error) {
      console.error(error);
      toast.error("Could not export the card", { description: "Check image permissions or try again." });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-border-warm bg-card p-4 shadow-warm-lg sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[.18em] text-primary">Marketing asset studio</p>
          <h2 className="mt-3 font-display text-3xl text-espresso">Premium Vendor Card</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Automatically composed from your store profile, products, QR code, verification status and ZANGO category theme.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
          <Select value={theme} onValueChange={(value) => setTheme(value as VendorCardThemeName)}>
            <SelectTrigger className="rounded-full"><SelectValue placeholder="Theme" /></SelectTrigger>
            <SelectContent>{Object.values(vendorCardThemes).map((item) => <SelectItem key={item.name} value={item.name}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={format} onValueChange={(value) => setFormat(value as VendorCardFormat)}>
            <SelectTrigger className="rounded-full"><SelectValue placeholder="Format" /></SelectTrigger>
            <SelectContent>{Object.entries(vendorCardFormats).map(([key, item]) => <SelectItem key={key} value={key}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button disabled={isExporting} onClick={() => exportCard()} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="mr-2 h-4 w-4" /> {isExporting ? "Exporting…" : "Download"}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {(Object.keys(vendorCardFormats) as VendorCardFormat[]).slice(0, 4).map((item) => (
          <button key={item} onClick={() => exportCard(item)} className="rounded-2xl border border-border-warm bg-background p-3 text-left transition hover:border-primary/40 hover:shadow-warm">
            <p className="text-sm font-semibold text-espresso">{vendorCardFormats[item].label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{vendorCardFormats[item].width}×{vendorCardFormats[item].height}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-auto rounded-[2rem] bg-[#2A1B16] p-5">
        <div className="origin-top-left transition-transform duration-300" style={{ width: dimensions.width * scale, height: dimensions.height * scale }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <VendorCard ref={cardRef} vendor={vendor} products={products} theme={theme} format={format} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
        <p className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> Exports for Instagram, WhatsApp, square, landscape, business card and A4.</p>
        <p className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-primary" /> Regenerate after updating store profile, logo, location or products.</p>
        <p className="flex items-center gap-2"><Download className="h-4 w-4 text-primary" /> Cached browser image export keeps quality high without server setup.</p>
      </div>
      {canRegenerate ? <p className="mt-3 text-xs font-medium text-primary">Admin/vendor regeneration is available by changing theme or format and exporting a fresh card.</p> : null}
    </section>
  );
}
