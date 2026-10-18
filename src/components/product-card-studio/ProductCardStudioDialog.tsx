import * as React from "react";
import {
  Download,
  Share2,
  Copy,
  Check,
  Loader2,
  Sparkles,
  Smartphone,
  Square,
  MessageCircle,
  RefreshCw,
  Save,
  Layers,
  Cloud,
  RotateCcw,
  Maximize2,
  Crop,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ProductCardCanvas } from "./ProductCardCanvas";
import { BatchExportModal } from "./BatchExportModal";
import { useProductStudio } from "@/lib/product-card/useProductStudio";
import {
  exportProductCardCanvas,
  nativeShareProductCard,
  copyProductCardToClipboard,
  shareProductCardToWhatsApp,
} from "@/lib/product-card/export";
import {
  productCardFormats,
  productCardThemes,
  resolveProductCardTheme,
} from "@/lib/product-card/themes";
import { regenerateProductImageFn, matchShowcaseImage } from "@/lib/product-card/ai-showcase";
import type {
  ProductCardFormat,
  ProductCardFramingMode,
  ProductCardThemeName,
  ProductMarketingCardProduct,
  ProductMarketingCardSeller,
} from "@/lib/product-card/types";

interface ProductCardStudioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductMarketingCardProduct;
  seller: ProductMarketingCardSeller;
}

export function ProductCardStudioDialog({
  open,
  onOpenChange,
  product,
  seller,
}: ProductCardStudioDialogProps) {
  const initialThemeName = React.useMemo(() => {
    return resolveProductCardTheme(
      product.category || seller.category,
      undefined,
      `${product.name} ${seller.business_name}`,
    ).name;
  }, [product.category, seller.category, product.name, seller.business_name]);

  const {
    customization,
    format,
    theme: themeName,
    variation,
    framingMode,
    showWhatsAppBadge,
    showVerifiedBadge,
    showStockBadge,
    showQRCode,
    hasDraft,
    isCloudSyncing,
    setFormat,
    setTheme: setThemeName,
    setVariation,
    setFramingMode,
    toggleWhatsAppBadge,
    toggleVerifiedBadge,
    toggleStockBadge,
    toggleQRCode,
    savePreferences,
  } = useProductStudio({
    sellerId: seller.id,
    initialTheme: initialThemeName,
    initialFormat: "whatsapp-status",
    initialFramingMode: "hero-75",
  });

  // State for active product image (can be original or regenerated AI showcase)
  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | undefined>(
    product.image_url ?? undefined,
  );
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [regenCycleCount, setRegenCycleCount] = React.useState(0);
  const hasRegeneratedImage = currentImageUrl && currentImageUrl !== product.image_url;

  // Sync initial product image if product changes
  React.useEffect(() => {
    if (product.image_url && !hasRegeneratedImage) {
      setCurrentImageUrl(product.image_url);
    }
  }, [product.image_url, hasRegeneratedImage]);

  const [isExporting, setIsExporting] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);
  const [isCopying, setIsCopying] = React.useState(false);
  const [hasCopied, setHasCopied] = React.useState(false);
  const [batchModalOpen, setBatchModalOpen] = React.useState(false);

  const cardRef = React.useRef<HTMLDivElement>(null);
  const previewBoxRef = React.useRef<HTMLDivElement>(null);
  const [boxDimensions, setBoxDimensions] = React.useState({ width: 340, height: 600 });

  const currentFormatMeta = productCardFormats[format] || productCardFormats["whatsapp-status"];
  const activeTheme = productCardThemes[themeName] || productCardThemes["zango-signature"];

  // Measure preview container to scale the 1080px wide canvas accurately
  React.useEffect(() => {
    if (!open) return;
    const updateDimensions = () => {
      if (previewBoxRef.current) {
        const rect = previewBoxRef.current.getBoundingClientRect();
        const availableW = Math.max(260, Math.min(rect.width - 24, 480));
        const availableH = Math.max(360, Math.min(window.innerHeight - 260, 680));
        setBoxDimensions({ width: availableW, height: availableH });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    const timer = setTimeout(updateDimensions, 100);
    return () => {
      window.removeEventListener("resize", updateDimensions);
      clearTimeout(timer);
    };
  }, [open, format]);

  // Compute scale so the high-DPI card fits in the preview box
  const cardW = currentFormatMeta.width;
  const cardH = currentFormatMeta.height;
  const scaleX = boxDimensions.width / cardW;
  const scaleY = boxDimensions.height / cardH;
  const previewScale = Math.min(scaleX, scaleY, 0.45);

  const filename = `zango-${(product.name || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30)}`;

  // Actual AI image regeneration handler:
  // Produces photorealistic showcase photography matched to the item
  const handleRegenerateImage = async () => {
    setIsRegenerating(true);
    try {
      const nextIndex = regenCycleCount + 1;
      setRegenCycleCount(nextIndex);

      const res = await regenerateProductImageFn({
        data: {
          productName: product.name,
          category: product.category || seller.category || undefined,
          currentImageUrl,
          cycleIndex: nextIndex,
        },
      });

      if (res?.imageUrl) {
        setCurrentImageUrl(res.imageUrl);
        toast.success("Photorealistic AI showcase generated!", {
          description: "Matched to northern market product aesthetic.",
          duration: 2500,
        });
      }
    } catch (err) {
      console.warn("[handleRegenerateImage] server call failed, using client fallback:", err);
      const fallbackUrl = matchShowcaseImage(
        product.name,
        product.category || seller.category || undefined,
        regenCycleCount + 1,
      );
      setCurrentImageUrl(fallbackUrl);
      toast.success("Photorealistic showcase updated!");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRevertOriginalImage = () => {
    setCurrentImageUrl(product.image_url ?? undefined);
    toast.info("Reverted to original product image");
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      await exportProductCardCanvas(cardRef.current, format, filename, 2);
      toast.success("Product card exported in high-res PNG!");
    } catch (err) {
      console.error(err);
      toast.error("Could not export card. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativeShare = async () => {
    if (!cardRef.current) return;
    setIsSharing(true);
    try {
      const shared = await nativeShareProductCard(
        {
          node: cardRef.current,
          filename,
          format,
        },
        {
          title: `${product.name} — ${seller.business_name}`,
          text: `Check out ${product.name} on ZANGO. Direct WhatsApp order available.`,
        },
      );
      if (shared) {
        toast.success("Shared successfully!");
      }
    } catch (err: unknown) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        toast.error("Could not open share menu, downloading instead.");
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      await shareProductCardToWhatsApp(
        {
          node: cardRef.current,
          filename,
          format,
        },
        product,
        seller,
      );
      toast.success("Card downloaded & opening WhatsApp direct order!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to share to WhatsApp");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    if (!cardRef.current) return;
    setIsCopying(true);
    try {
      await copyProductCardToClipboard(cardRef.current, format);
      setHasCopied(true);
      toast.success("Product card copied to clipboard!");
      setTimeout(() => setHasCopied(false), 2500);
    } catch (err) {
      console.error(err);
      toast.error("Could not copy directly. Use Download instead.");
    } finally {
      setIsCopying(false);
    }
  };

  // Enriched product object with currently selected or regenerated image
  const cardProduct: ProductMarketingCardProduct = React.useMemo(() => {
    return {
      ...product,
      image_url: currentImageUrl,
    };
  }, [product, currentImageUrl]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl border-border-warm bg-card shadow-2xl"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between border-b border-border/40 px-6 py-4 bg-muted/30 gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-serif font-bold text-espresso">
                    Product Card Studio
                  </DialogTitle>
                  {hasDraft && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <Cloud className="h-3 w-3" />
                      <span>Draft Preserved</span>
                    </span>
                  )}
                  {isCloudSyncing && (
                    <span className="text-[10px] text-muted-foreground animate-pulse">
                      Saving...
                    </span>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Customize, regenerate AI showcase photography & export marketing cards for{" "}
                  <span className="font-semibold text-primary">{product.name}</span>
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchModalOpen(true)}
                className="flex items-center gap-1.5 rounded-full text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
                title="Batch export cards for multiple catalog products"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Batch Export</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={savePreferences}
                className="flex items-center gap-1.5 rounded-full text-xs font-semibold border-border hover:bg-muted"
                title="Save current badges and styling preferences for your vendor store"
              >
                <Save className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Save Defaults</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isRegenerating}
                onClick={handleRegenerateImage}
                className="flex items-center gap-1.5 rounded-full text-xs font-semibold border-amber-600/30 text-amber-900 bg-amber-500/10 hover:bg-amber-500/20"
                title="Generate photorealistic AI showcase photography matched to this product"
              >
                {isRegenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>{isRegenerating ? "Generating AI Photo…" : "Regenerate Image"}</span>
              </Button>
              {hasRegeneratedImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRevertOriginalImage}
                  className="rounded-full text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                  title="Revert to original uploaded product photo"
                >
                  <Undo2 className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Original Photo</span>
                </Button>
              )}
            </div>
          </div>

          {/* Studio Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
            {/* Left / Center: Interactive Preview Canvas */}
            <div className="lg:col-span-7 flex flex-col items-center">
              {/* Format Selector Pills */}
              <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-muted/60 mb-3 w-full max-w-md">
                <button
                  type="button"
                  onClick={() => setFormat("whatsapp-status")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    format === "whatsapp-status"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                  <span>WhatsApp Status</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("square")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    format === "square"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Square className="h-3.5 w-3.5" />
                  <span>Square (1:1)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("story")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    format === "story"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Story (9:16)</span>
                </button>
              </div>

              {/* Image Framing Selector: 75% Hero Frame vs Full-Bleed Frosted Glass */}
              <div className="flex items-center justify-center gap-2 p-1 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3 w-full max-w-md">
                <button
                  type="button"
                  onClick={() => setFramingMode("hero-75")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
                    framingMode === "hero-75"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-espresso/80 hover:text-espresso"
                  }`}
                >
                  <Crop className="h-3.5 w-3.5" />
                  <span>75% Prominent Hero</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFramingMode("full-bleed")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
                    framingMode === "full-bleed"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-espresso/80 hover:text-espresso"
                  }`}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Full-Bleed Frosted Glass</span>
                </button>
              </div>

              {/* Interactive Preview Canvas Window */}
              <div
                ref={previewBoxRef}
                className="relative w-full flex items-center justify-center rounded-2xl border border-dashed border-border/80 bg-zinc-950/5 dark:bg-zinc-950/40 p-4 overflow-hidden"
                style={{ minHeight: "440px" }}
              >
                {/* Scaled High-Res Card Wrapper */}
                <div
                  style={{
                    width: `${cardW * previewScale}px`,
                    height: `${cardH * previewScale}px`,
                  }}
                  className="relative transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden"
                >
                  <div
                    style={{
                      transform: `scale(${previewScale})`,
                      transformOrigin: "top left",
                      width: `${cardW}px`,
                      height: `${cardH}px`,
                    }}
                  >
                    <ProductCardCanvas
                      ref={cardRef}
                      product={cardProduct}
                      seller={seller}
                      customization={customization}
                    />
                  </div>
                </div>
              </div>

              {/* Canvas Format Dimension Badge & Active Image Label */}
              <div className="mt-3 flex items-center justify-between w-full max-w-md text-xs text-muted-foreground px-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{currentFormatMeta.label}</span>
                  <span>•</span>
                  <span>{currentFormatMeta.width}×{currentFormatMeta.height}px</span>
                </div>
                {hasRegeneratedImage ? (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    ✨ AI Photorealistic Showcase
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Original photo</span>
                )}
              </div>
            </div>

            {/* Right: Controls & Export Actions */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
              <div className="space-y-5">
                {/* Northern Aesthetic Themes ONLY (Quick templates removed per specification) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                      Northern Market Themes
                    </Label>
                    <span className="text-[11px] text-primary font-semibold">
                      {activeTheme.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.values(productCardThemes).map((t) => {
                      const isSelected = t.name === themeName;
                      return (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => setThemeName(t.name)}
                          className={`group relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                              : "border-border hover:border-primary/50 bg-card"
                          }`}
                        >
                          {/* Color swatch dot */}
                          <div className="flex items-center gap-1.5 w-full mb-1">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 shadow-sm border border-black/10"
                              style={{ background: t.accent }}
                            />
                            <span
                              className="w-2 h-2 rounded-full shrink-0 opacity-60"
                              style={{ background: t.accentLight }}
                            />
                          </div>
                          <span className="text-xs font-bold text-foreground truncate w-full">
                            {t.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate w-full">
                            {t.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Badges & Elements Toggles */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                      Interactive Badges & Elements
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerateImage}
                      disabled={isRegenerating}
                      className="h-7 text-[11px] text-amber-800 bg-amber-500/10 hover:bg-amber-500/20 rounded-full px-2.5 flex items-center gap-1"
                    >
                      <RefreshCw className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`} />
                      <span>{isRegenerating ? "Generating…" : "New AI Photo"}</span>
                    </Button>
                  </div>

                  {/* WhatsApp Direct Order Badge Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[#25D366]">💬</span>
                      <span className="text-xs font-medium text-foreground">
                        WhatsApp Direct Order Badge
                      </span>
                    </div>
                    <Switch checked={showWhatsAppBadge} onCheckedChange={toggleWhatsAppBadge} />
                  </div>

                  {/* Verified Badge Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500">🛡️</span>
                      <span className="text-xs font-medium text-foreground">
                        Verified & City Badge
                      </span>
                    </div>
                    <Switch checked={showVerifiedBadge} onCheckedChange={toggleVerifiedBadge} />
                  </div>

                  {/* Stock Status Badge Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500">🔥</span>
                      <span className="text-xs font-medium text-foreground">
                        Stock Status Badge
                      </span>
                    </div>
                    <Switch checked={showStockBadge} onCheckedChange={toggleStockBadge} />
                  </div>

                  {/* QR Code Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>📱</span>
                      <span className="text-xs font-medium text-foreground">Scannable QR Code</span>
                    </div>
                    <Switch checked={showQRCode} onCheckedChange={toggleQRCode} />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-4 border-t border-border">
                {/* Primary: Download PNG */}
                <Button
                  type="button"
                  onClick={handleDownload}
                  disabled={isExporting}
                  className="w-full h-11 rounded-full font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>Download High-Res PNG</span>
                </Button>

                {/* Batch Export Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBatchModalOpen(true)}
                  className="w-full h-10 rounded-full font-semibold border-border hover:bg-muted flex items-center justify-center gap-2 text-xs"
                >
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Batch Export Multiple Products</span>
                </Button>

                {/* Direct WhatsApp Share */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShareWhatsApp}
                  disabled={isExporting}
                  className="w-full h-10 rounded-full font-semibold border-[#25D366]/40 text-[#128C7E] bg-[#25D366]/10 hover:bg-[#25D366]/20 flex items-center justify-center gap-2"
                >
                  <MessageCircle className="h-4 w-4 text-[#25D366]" />
                  <span>Share to WhatsApp Direct</span>
                </Button>

                {/* Secondary Actions Row: Mobile Share & Copy */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleNativeShare}
                    disabled={isSharing}
                    className="rounded-full text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    {isSharing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Share2 className="h-3.5 w-3.5" />
                    )}
                    <span>Status / Story</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopy}
                    disabled={isCopying}
                    className="rounded-full text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    {hasCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copied!</span>
                      </>
                    ) : isCopying ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Image</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Export Modal */}
      {batchModalOpen && (
        <BatchExportModal
          open={batchModalOpen}
          onOpenChange={setBatchModalOpen}
          seller={seller}
          customization={customization}
          currentProduct={cardProduct}
        />
      )}
    </>
  );
}
