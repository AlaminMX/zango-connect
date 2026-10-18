import * as React from "react";
import {
  Download,
  Loader2,
  CheckSquare,
  Square as SquareIcon,
  X,
  AlertCircle,
  Package,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductCardCanvas } from "./ProductCardCanvas";
import { batchExportCardsSequentially, type BatchExportProgress } from "@/lib/product-card/export";
import type {
  ProductCardCustomization,
  ProductMarketingCardProduct,
  ProductMarketingCardSeller,
} from "@/lib/product-card/types";
import { toast } from "sonner";

interface BatchExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seller: ProductMarketingCardSeller;
  customization: ProductCardCustomization;
  currentProduct?: ProductMarketingCardProduct;
}

export function BatchExportModal({
  open,
  onOpenChange,
  seller,
  customization,
  currentProduct,
}: BatchExportModalProps) {
  const [products, setProducts] = React.useState<ProductMarketingCardProduct[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [progress, setProgress] = React.useState<BatchExportProgress | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Hidden container ref used for off-screen canvas rendering
  const [renderItem, setRenderItem] = React.useState<ProductMarketingCardProduct | null>(null);
  const batchCanvasRef = React.useRef<HTMLDivElement>(null);

  // Fetch vendor's products
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        let query = supabase
          .from("products")
          .select("id, name, price, image_url, stock_status, status, category")
          .order("created_at", { ascending: false })
          .limit(60);

        if (seller.id && seller.id !== "admin-vendor") {
          query = query.eq("seller_id", seller.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (cancelled) return;

        const list = (data || []) as ProductMarketingCardProduct[];
        setProducts(list);

        // Pre-select current product by default
        if (currentProduct) {
          setSelectedIds(new Set([currentProduct.id]));
        } else if (list.length > 0) {
          setSelectedIds(new Set([list[0].id]));
        }
      } catch (err) {
        console.warn("[BatchExportModal] Could not fetch products:", err);
        // Fallback: If currentProduct is provided, at least offer it
        if (currentProduct) {
          setProducts([currentProduct]);
          setSelectedIds(new Set([currentProduct.id]));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, seller.id, currentProduct]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const handleStartBatch = async () => {
    const selectedItems = products.filter((p) => selectedIds.has(p.id));
    if (selectedItems.length === 0) {
      toast.error("Please select at least one product to export");
      return;
    }

    setIsExporting(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const items = selectedItems.map((prod) => ({
        product: prod,
        seller,
      }));

      const res = await batchExportCardsSequentially({
        items,
        format: customization.format,
        signal: controller.signal,
        delayMs: 500, // 500ms safety interval for browser downloads
        onProgress: (p) => setProgress(p),
        renderNode: async (item) => {
          setRenderItem(item.product);
          // Wait for DOM flush and paint
          await new Promise((r) => setTimeout(r, 120));
          return batchCanvasRef.current;
        },
      });

      if (res.successful > 0) {
        toast.success(
          `Batch download complete! Exported ${res.successful} marketing ${
            res.successful === 1 ? "card" : "cards"
          }.`,
        );
        onOpenChange(false);
      } else if (!controller.signal.aborted) {
        toast.error("Failed to export products. Please try again.");
      }
    } catch (err: unknown) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        console.error(err);
        toast.error("Error during batch download.");
      }
    } finally {
      setIsExporting(false);
      setProgress(null);
      setRenderItem(null);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast.info("Batch download cancelled");
    }
  };

  return (
    <Dialog open={open} onOpenChange={isExporting ? () => {} : onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] p-0 rounded-3xl border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Batch Export Marketing Cards
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Download customized marketing graphics for multiple products individually.
              </DialogDescription>
            </div>
          </div>
          {!isExporting && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Product Selection List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border/40">
            <button
              type="button"
              onClick={selectAll}
              disabled={isExporting || products.length === 0}
              className="flex items-center gap-1.5 font-semibold text-primary hover:underline transition"
            >
              {selectedIds.size === products.length && products.length > 0 ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <SquareIcon className="h-4 w-4" />
              )}
              <span>
                {selectedIds.size === products.length && products.length > 0
                  ? "Deselect All"
                  : "Select All"}
              </span>
            </button>
            <span className="font-mono">
              {selectedIds.size} of {products.length} selected
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading store catalog...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No products available to export.
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((p) => {
                const isSelected = selectedIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => !isExporting && toggleSelect(p.id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-primary/5 border-primary/50 shadow-sm"
                        : "bg-background border-border/70 hover:border-border"
                    } ${isExporting ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    <div className="text-primary shrink-0">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <SquareIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="h-10 w-10 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/50">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          crossOrigin="anonymous"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                          No Pic
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.price && Number(p.price) > 0
                          ? `₦${Number(p.price).toLocaleString()}`
                          : "Price on request"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Batch Progress UI */}
          {isExporting && progress && (
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>
                    Exporting {progress.current} of {progress.total}
                  </span>
                </span>
                <span className="text-[11px] font-mono">
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-primary/20 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                />
              </div>

              <p className="text-[11px] text-muted-foreground truncate">
                Processing:{" "}
                <span className="font-semibold text-foreground">{progress.productName}</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border/50 px-6 py-4 bg-muted/20 flex items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground">
            Cards are exported in{" "}
            <span className="font-semibold text-foreground">{customization.format}</span> format.
          </div>

          <div className="flex items-center gap-2">
            {isExporting ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
                className="rounded-full text-xs font-semibold"
              >
                Cancel Export
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="rounded-full text-xs font-semibold"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={handleStartBatch}
                  disabled={selectedIds.size === 0}
                  className="rounded-full text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download ({selectedIds.size}) Cards</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Hidden off-screen render container for batch processing */}
        {renderItem && (
          <div
            style={{
              position: "fixed",
              top: "-9999px",
              left: "-9999px",
              opacity: 0,
              pointerEvents: "none",
            }}
          >
            <ProductCardCanvas
              ref={batchCanvasRef}
              product={renderItem}
              seller={seller}
              customization={customization}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
