import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { slugify } from "@/lib/whatsapp";
import { Check, Copy, Share2 } from "lucide-react";

const CITIES = ["Kano", "Kaduna", "Abuja", "Other"];

export const Route = createFileRoute("/register")({ component: Register });

function Register() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [sellerSlug, setSellerSlug] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Step 1 fields
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");

  // Step 2
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Step 3
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pImg, setPImg] = useState<File | null>(null);

  const [categories, setCategories] = useState<{ name: string }[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { nav({ to: "/auth" }); return; }
      setUserId(data.user.id);
      const { data: existing } = await supabase.from("sellers").select("id, slug").eq("user_id", data.user.id).maybeSingle();
      if (existing) { setSellerId(existing.id); setSellerSlug(existing.slug); setStep(3); }
    });
    supabase.from("categories").select("name").order("sort_order").then(({ data }) => setCategories(data ?? []));
  }, [nav]);

  const uploadImage = async (file: File, prefix: string): Promise<string | null> => {
    if (!userId) return null;
    const ext = file.name.split(".").pop();
    const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("sutura").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return null; }
    return supabase.storage.from("sutura").getPublicUrl(path).data.publicUrl;
  };

  const submitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setBusy(true);
    const baseSlug = slugify(businessName);
    let slug = baseSlug;
    let attempt = 0;
    while (attempt < 5) {
      const { data: clash } = await supabase.from("sellers").select("id").eq("slug", slug).maybeSingle();
      if (!clash) break;
      attempt++; slug = `${baseSlug}-${Math.floor(Math.random() * 999)}`;
    }
    const { data, error } = await supabase.from("sellers").insert({
      user_id: userId, name, business_name: businessName, slug,
      whatsapp_number: whatsapp, city, category, bio,
    }).select().single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSellerId(data.id); setSellerSlug(data.slug); setStep(2);
  };

  const submitStep2 = async () => {
    if (!sellerId) return;
    setBusy(true);
    const updates: { profile_photo_url?: string; cover_photo_url?: string } = {};
    if (profileFile) { const url = await uploadImage(profileFile, "profile"); if (url) updates.profile_photo_url = url; }
    if (coverFile) { const url = await uploadImage(coverFile, "cover"); if (url) updates.cover_photo_url = url; }
    if (Object.keys(updates).length) {
      const { error } = await supabase.from("sellers").update(updates).eq("id", sellerId);
      if (error) { toast.error(error.message); setBusy(false); return; }
    }
    setBusy(false); setStep(3);
  };

  const submitStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId) return;
    setBusy(true);
    let image_url: string | null = null;
    if (pImg) image_url = await uploadImage(pImg, "product");
    const { error } = await supabase.from("products").insert({
      seller_id: sellerId, name: pName, price: Number(pPrice), description: pDesc, image_url,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Product added!");
    setPName(""); setPPrice(""); setPDesc(""); setPImg(null);
    setStep(4);
  };

  const shareUrl = sellerSlug && typeof window !== "undefined" ? `${window.location.origin}/store/${sellerSlug}` : "";

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-xl px-5 py-8">
        <h1 className="font-serif text-3xl">Fara Kasuwanci — Start Your Store</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome to the community · Step {Math.min(step, 3)} of 3</p>

        <div className="mt-4 flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-warm">
          {step === 1 && (
            <form onSubmit={submitStep1} className="space-y-4">
              <h2 className="font-serif text-xl">Business info</h2>
              <div><Label>Business name</Label><Input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div>
              <div><Label>Your name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>WhatsApp number</Label><Input required placeholder="+234..." value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
              <div>
                <Label>City</Label>
                <Select value={city} onValueChange={setCity}><SelectTrigger><SelectValue placeholder="Choose city" /></SelectTrigger>
                  <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Short bio (max 150 chars)</Label><Textarea maxLength={150} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
              <Button type="submit" disabled={busy || !city || !category} className="w-full rounded-full bg-primary py-6 text-base text-primary-foreground hover:bg-primary/90">
                {busy ? "Saving…" : "Open My Store →"}
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-serif text-xl">Upload photos</h2>
              <div><Label>Profile photo</Label><Input type="file" accept="image/*" onChange={(e) => setProfileFile(e.target.files?.[0] ?? null)} /></div>
              <div><Label>Cover photo (optional)</Label><Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} /></div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1 rounded-full">Skip</Button>
                <Button onClick={submitStep2} disabled={busy} className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {busy ? "Uploading…" : "Continue"}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={submitStep3} className="space-y-4">
              <h2 className="font-serif text-xl">Add your first product</h2>
              <div><Label>Product name</Label><Input required value={pName} onChange={(e) => setPName(e.target.value)} /></div>
              <div><Label>Price (₦)</Label><Input required type="number" min="0" value={pPrice} onChange={(e) => setPPrice(e.target.value)} /></div>
              <div><Label>Product photo</Label><Input type="file" accept="image/*" onChange={(e) => setPImg(e.target.files?.[0] ?? null)} /></div>
              <div><Label>Short description</Label><Textarea value={pDesc} onChange={(e) => setPDesc(e.target.value)} /></div>
              <Button type="submit" disabled={busy} className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                {busy ? "Adding…" : "Add Product"}
              </Button>
              {sellerSlug && (
                <Link to="/store/$slug" params={{ slug: sellerSlug }} className="block text-center text-sm text-muted-foreground underline">
                  Skip — view my store
                </Link>
              )}
            </form>
          )}

          {step === 4 && sellerSlug && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="font-serif text-2xl">Your store is live! 🎉</h2>
              <p className="text-sm text-muted-foreground">Share it everywhere to start getting orders.</p>
              <div className="flex items-center gap-2 rounded-full border bg-muted px-3 py-2 text-sm">
                <span className="flex-1 truncate text-left">{shareUrl}</span>
                <button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copied"); }}>
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Check out my store on Sutura Market 🛍️ ${shareUrl}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-whatsapp)] py-3 font-medium text-[var(--color-whatsapp-foreground)]"
              >
                <Share2 className="h-4 w-4" /> Share on WhatsApp
              </a>
              <Link to="/store/$slug" params={{ slug: sellerSlug }} className="block text-sm text-primary underline">
                View my store →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
