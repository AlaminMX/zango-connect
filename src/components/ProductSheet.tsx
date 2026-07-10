/**
 * ProductSheet — shared Add/Edit Product bottom sheet.
 * - Add: price optional, up to 5 images, name required.
 * - Edit: enforces 7-day price lock when price was previously set.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiImageUploader } from "@/components/MultiImageUploader";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

const PRICE_LOCK_DAYS = 7;
const MS_PER_DAY = 86_400_000;

export interface ProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  sellerId: string;
  sellerSlug?: string;
  sellerCategory?: string;
  product?: {
    id: string;
    name: string;
    price: number | null;
    description: string | null;
    image_url: string | null;
    image_urls: string[] | null;
    stock_status: string;
    price_updated_at: string | null;
    category?: string;
  };
  onSaved?: () => void;
}

export function ProductSheet({
  open, onOpenChange, mode, sellerId, sellerCategory, product, onSaved,
}: ProductSheetProps) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [stock, setStock] = useState<"available" | "low_stock" | "sold_out">("available");
  const [category, setCategory] = useState<string>(sellerCategory || "");
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && product) {
      setName(product.name);
      setPrice(product.price != null ? String(product.price) : "");
      setDesc(product.description ?? "");
      const existing = product.image_urls && product.image_urls.length > 0
        ? product.image_urls
        : product.image_url ? [product.image_url] : [];
      setImages(existing);
      setStock((product.stock_status as any) ?? "available");
      setCategory(product.category || sellerCategory || "");
      setAttributes({});
    } else {
      setName(""); setPrice(""); setDesc(""); setImages([]); setStock("available");
      setCategory(sellerCategory || "");
      setAttributes({});
    }
  }, [open, mode, product, sellerCategory]);

  // Price lock: only on edit, only when there was a previously set price
  const priceLock = (() => {
    if (mode !== "edit" || !product) return null;
    if (product.price == null || !product.price_updated_at) return null;
    const last = new Date(product.price_updated_at).getTime();
    const unlockAt = last + PRICE_LOCK_DAYS * MS_PER_DAY;
    if (Date.now() >= unlockAt) return null;
    return {
      lastChanged: new Date(last).toLocaleDateString(),
      unlockOn: new Date(unlockAt).toLocaleDateString(),
    };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Product name is required"); return; }
    const priceVal = price.trim() === "" ? null : Number(price);
    if (priceVal !== null && (!Number.isFinite(priceVal) || priceVal <= 0)) {
      toast.error("Enter a valid price or leave blank for 'Price on request'"); return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        description: desc.trim() || null,
        image_url: images[0] ?? null,
        image_urls: images,
        stock_status: stock,
        category: category || null,
      };
      // Only include price when not locked
      if (mode === "add") {
        payload.price = priceVal;
        payload.seller_id = sellerId;
        payload.status = "active";
      } else if (!priceLock) {
        payload.price = priceVal;
      }

      const op = mode === "add"
        ? supabase.from("products").insert(payload).select("id").single()
        : supabase.from("products").update(payload).eq("id", product!.id).select("id").single();
      const { data, error } = await op;
      
      if (error) { toast.error(error.message); return; }

      // Generate metadata for search optimization
      if (data?.id) {
        try {
          await generateProductMetadata({
            productId: data.id,
            title: name.trim(),
            description: desc.trim() || "",
            category: category || "Other",
            condition: "New",
            attributes: attributes,
          });
        } catch (err) {
          console.warn("[v0] Metadata generation warning:", err);
        }
      }

      toast.success(mode === "add" ? "Product added" : "Product updated");
      qc.invalidateQueries({ queryKey: ["seller-products"] });
      qc.invalidateQueries({ queryKey: ["featured-products-bento"] });
      qc.invalidateQueries({ queryKey: ["store"] });
      qc.invalidateQueries({ queryKey: ["product", product?.id] });
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl pb-10">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-display text-2xl">
            {mode === "add" ? "Add new product" : "Edit product"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="mb-2 block">Photos</Label>
            <MultiImageUploader value={images} onChange={setImages} max={5} />
          </div>

          <div>
            <Label htmlFor="prod-name">Product name *</Label>
            <Input
              id="prod-name" required maxLength={120}
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hand-dyed Atampa"
              className="mt-1 min-h-[44px] rounded-full"
            />
          </div>

          {/* Category - optional but helps with search */}
          <div>
            <Label htmlFor="prod-category">
              Category <span className="text-xs text-muted-foreground">— optional</span>
            </Label>
            <Input
              id="prod-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={sellerCategory || "e.g. Fashion & Clothing"}
              className="mt-1 min-h-[44px] rounded-full"
            />
          </div>

          <div>
            <Label htmlFor="prod-price">
              Price (₦) <span className="text-xs text-muted-foreground">— optional</span>
            </Label>
            <Input
              id="prod-price" type="number" min="0" inputMode="decimal"
              value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="Leave blank for 'Price on request'"
              disabled={!!priceLock}
              className="mt-1 min-h-[44px] rounded-full"
            />
            {priceLock && (
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Price was last changed on <strong>{priceLock.lastChanged}</strong>.
                  You can update it again on <strong>{priceLock.unlockOn}</strong>.
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="prod-desc">Description</Label>
            <Textarea
              id="prod-desc" maxLength={1000}
              value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="What makes this product special?"
              className="mt-1 rounded-2xl"
              rows={3}
            />
          </div>

          <div>
            <Label>Stock</Label>
            <Select value={stock} onValueChange={(v: any) => setStock(v)}>
              <SelectTrigger className="mt-1 min-h-[44px] rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">In stock</SelectItem>
                <SelectItem value="low_stock">Low stock</SelectItem>
                <SelectItem value="sold_out">Out of stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category-specific attributes */}
          <CategoryAttributesForm
            category={category || sellerCategory}
            attributes={attributes}
            onChange={setAttributes}
          />

          <Button
            type="submit" disabled={saving}
            className="min-h-[48px] w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                    : mode === "add" ? "Add product" : "Save changes"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
