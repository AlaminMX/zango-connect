import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, Edit2, Trash2, Plus, Copy, Check,
} from "lucide-react";
import {
  generateProductMetadata,
  batchRegenerateMetadata,
  addSynonymGroup,
  updateProductAttributes,
  CATEGORY_ATTRIBUTES,
  DEFAULT_SYNONYM_GROUPS,
} from "@/lib/search-metadata.functions";

interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  condition?: string;
}

interface ProductMetadata {
  product_id: string;
  search_keywords: string[];
  search_index: string;
  attributes: Record<string, any>;
  updated_at: string;
}

interface SynonymGroup {
  primary_term: string;
  synonyms: string[];
}

export function AdminMetadataManager() {
  const [tab, setTab] = useState<"products" | "synonyms">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [metadata, setMetadata] = useState<Record<string, ProductMetadata>>({});
  const [synonyms, setSynonyms] = useState<SynonymGroup[]>(DEFAULT_SYNONYM_GROUPS);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Metadata editor state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [editAttributes, setEditAttributes] = useState<Record<string, any>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Synonym editor state
  const [newSynonymPrimary, setNewSynonymPrimary] = useState("");
  const [newSynonymList, setNewSynonymList] = useState("");
  const [addingSynonym, setAddingSynonym] = useState(false);

  // Load products and metadata
  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  async function loadProducts() {
    setLoading(true);
    try {
      let query = supabase.from("products").select("id, title, description, category, price, condition");

      if (selectedCategory) {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setProducts(data || []);

      // Load metadata for each product
      if (data && data.length > 0) {
        const { data: metaData, error: metaError } = await supabase
          .from("product_metadata")
          .select("*")
          .in(
            "product_id",
            data.map((p) => p.id),
          );

        if (metaError) throw metaError;

        const metaMap: Record<string, ProductMetadata> = {};
        metaData?.forEach((m) => {
          metaMap[m.product_id] = m;
        });
        setMetadata(metaMap);
      }
    } catch (error) {
      console.error("[v0] Load products error:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerateMetadata(productId?: string) {
    setLoading(true);
    try {
      if (productId) {
        // Regenerate single product
        const product = products.find((p) => p.id === productId);
        if (!product) return;

        const result = await generateProductMetadata({
          productId,
          title: product.title,
          description: product.description,
          category: product.category,
          condition: product.condition,
        });

        if (result.ok) {
          toast.success("Metadata regenerated");
          await loadProducts();
        }
      } else {
        // Batch regenerate
        const result = await batchRegenerateMetadata({
          category: selectedCategory || undefined,
          limit: 100,
        });

        if (result.ok) {
          toast.success(`Regenerated ${result.count} products`);
          await loadProducts();
        }
      }
    } catch (error) {
      console.error("[v0] Regenerate error:", error);
      toast.error("Failed to regenerate metadata");
    } finally {
      setLoading(false);
    }
  }

  function openEditDialog(product: Product) {
    const meta = metadata[product.id];
    setEditingProduct(product);
    setEditKeywords(meta?.search_keywords || []);
    setEditAttributes(meta?.attributes || {});
    setEditDialogOpen(true);
  }

  async function saveMetadata() {
    if (!editingProduct) return;

    setLoading(true);
    try {
      // Update keywords via metadata
      await generateProductMetadata({
        productId: editingProduct.id,
        title: editingProduct.title,
        description: editingProduct.description,
        category: editingProduct.category,
        condition: editingProduct.condition,
        attributes: editAttributes,
      });

      // Update attributes if custom
      if (Object.keys(editAttributes).length > 0) {
        await updateProductAttributes({
          productId: editingProduct.id,
          attributes: editAttributes,
        });
      }

      toast.success("Metadata saved");
      setEditDialogOpen(false);
      await loadProducts();
    } catch (error) {
      console.error("[v0] Save metadata error:", error);
      toast.error("Failed to save metadata");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSynonym() {
    if (!newSynonymPrimary.trim() || !newSynonymList.trim()) {
      toast.error("Please fill in both fields");
      return;
    }

    setAddingSynonym(true);
    try {
      const synonymArray = newSynonymList
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0);

      await addSynonymGroup({
        primaryTerm: newSynonymPrimary.toLowerCase(),
        synonyms: synonymArray,
      });

      // Add to local state
      setSynonyms([
        ...synonyms,
        {
          primary_term: newSynonymPrimary.toLowerCase(),
          synonyms: synonymArray,
        },
      ]);

      setNewSynonymPrimary("");
      setNewSynonymList("");
      toast.success("Synonym group added");
    } catch (error) {
      console.error("[v0] Add synonym error:", error);
      toast.error("Failed to add synonym group");
    } finally {
      setAddingSynonym(false);
    }
  }

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("products")}
          className={`px-4 py-2 font-medium transition ${
            tab === "products" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Product Metadata
        </button>
        <button
          onClick={() => setTab("synonyms")}
          className={`px-4 py-2 font-medium transition ${
            tab === "synonyms" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Synonym Groups
        </button>
      </div>

      {/* Products Tab */}
      {tab === "products" && (
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="category-filter" className="mb-2 block text-sm font-medium">
                Filter by Category
              </Label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => handleRegenerateMetadata()}
              disabled={loading || products.length === 0}
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Regenerate All
            </Button>
          </div>

          {/* Products list */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted/40" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No products found
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border divide-y max-h-[60vh] overflow-y-auto">
              {products.map((product) => {
                const meta = metadata[product.id];
                return (
                  <div key={product.id} className="flex items-start justify-between gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1">{product.title}</h4>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                      {meta && (
                        <div className="mt-2 text-xs">
                          <p className="text-muted-foreground">Keywords: {meta.search_keywords.length}</p>
                          <p className="text-muted-foreground">Updated: {new Date(meta.updated_at).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(product)}
                        className="gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRegenerateMetadata(product.id)}
                        disabled={loading}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Synonyms Tab */}
      {tab === "synonyms" && (
        <div className="space-y-4">
          {/* Add new synonym */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-medium">Add Synonym Group</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="primary-term" className="text-sm mb-2 block">
                  Primary Term
                </Label>
                <Input
                  id="primary-term"
                  placeholder="e.g., phone"
                  value={newSynonymPrimary}
                  onChange={(e) => setNewSynonymPrimary(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="synonym-list" className="text-sm mb-2 block">
                  Synonyms (comma-separated)
                </Label>
                <Input
                  id="synonym-list"
                  placeholder="e.g., smartphone, mobile, cellular"
                  value={newSynonymList}
                  onChange={(e) => setNewSynonymList(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleAddSynonym}
              disabled={addingSynonym}
              className="gap-2"
            >
              {addingSynonym ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Synonym Group
            </Button>
          </div>

          {/* Existing synonyms */}
          <div className="space-y-2">
            <h3 className="font-medium">Existing Groups ({synonyms.length})</h3>
            <ScrollArea className="h-96 border rounded-lg p-4">
              <div className="space-y-3">
                {synonyms.map((group, i) => (
                  <div key={i} className="rounded-lg bg-muted/40 p-3">
                    <p className="font-medium text-sm">{group.primary_term}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {group.synonyms.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Edit Metadata Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Metadata: {editingProduct?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Keywords editor */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Search Keywords</Label>
              <Textarea
                value={editKeywords.join(", ")}
                onChange={(e) => setEditKeywords(e.target.value.split(",").map((k) => k.trim()))}
                placeholder="comma-separated keywords"
                className="min-h-24"
              />
            </div>

            {/* Attributes editor for category */}
            {editingProduct && CATEGORY_ATTRIBUTES[editingProduct.category] && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Category Attributes</Label>
                <div className="space-y-3">
                  {CATEGORY_ATTRIBUTES[editingProduct.category].map((attr) => (
                    <div key={attr.name}>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        {attr.name}
                      </label>
                      {attr.values ? (
                        <select
                          value={editAttributes[attr.name] || ""}
                          onChange={(e) =>
                            setEditAttributes({
                              ...editAttributes,
                              [attr.name]: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select {attr.name}</option>
                          {attr.values.map((val) => (
                            <option key={val} value={val}>
                              {val}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={editAttributes[attr.name] || ""}
                          onChange={(e) =>
                            setEditAttributes({
                              ...editAttributes,
                              [attr.name]: e.target.value,
                            })
                          }
                          placeholder={`Enter ${attr.name}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveMetadata} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
