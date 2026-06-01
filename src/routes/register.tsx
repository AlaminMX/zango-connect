/**
 * register.tsx — Seller registration (2 steps + confirmation).
 * Pending verification: product creation is gated until admin approval,
 * so the registration flow only collects profile + photos and ends with
 * a confirmation screen.
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploader } from "@/components/ImageUploader";
import { toast } from "sonner";
import { slugify, validateNigerianPhone } from "@/lib/whatsapp";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, Clock, Home } from "lucide-react";
import { NIGERIAN_CITIES } from "@/lib/categories";

export const Route = createFileRoute("/register")({ component: Register });

type Errors = Record<string, string>;

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3" /> {msg}
    </p>
  );
}

function Register() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  // Step 1
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [otherCity, setOtherCity] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");

  // Step 2
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const [categories, setCategories] = useState<{ name: string }[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { nav({ to: "/auth" }); return; }
      setUserId(data.user.id);
      const { data: existing } = await supabase
        .from("sellers").select("id, profile_photo_url, cover_photo_url, verification_status").eq("user_id", data.user.id).maybeSingle();
      if (existing) {
        setSellerId(existing.id);
        setProfileUrl(existing.profile_photo_url ?? null);
        setCoverUrl(existing.cover_photo_url ?? null);
        // If they already submitted, jump to confirmation
        setStep(existing.profile_photo_url ? 3 : 2);
      }
    });
    supabase.from("categories").select("name").order("sort_order").then(({ data }) => setCategories(data ?? []));
  }, [nav]);

  const validateStep1 = (): Errors => {
    const e: Errors = {};
    if (!businessName.trim()) e.businessName = "Business name is required";
    if (!name.trim()) e.name = "Your name is required";
    if (!whatsapp.trim()) e.whatsapp = "WhatsApp number is required";
    else { const c = validateNigerianPhone(whatsapp); if (!c.valid) e.whatsapp = c.error ?? "Invalid phone number"; }
    if (!city) e.city = "Please choose a city";
    if (city === "Other" && !otherCity.trim()) e.otherCity = "Please type your city";
    if (!category) e.category = "Please choose a category";
    return e;
  };

  const submitStep1 = async () => {
    const errs = validateStep1();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    if (!userId) return;
    setBusy(true);
    const baseSlug = slugify(businessName);
    let slug = baseSlug;
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await supabase.from("sellers").select("id").eq("slug", slug).maybeSingle();
      if (!clash) break;
      slug = `${baseSlug}-${Math.floor(Math.random() * 999)}`;
    }
    const finalCity = city === "Other" ? otherCity.trim() : city;
    const { data: cityRow } = await supabase
      .from("cities_of_business").select("id").ilike("name", finalCity).maybeSingle();
    const { data, error } = await supabase.from("sellers").insert({
      user_id: userId, name, business_name: businessName.trim(), slug,
      whatsapp_number: whatsapp, city: finalCity, city_id: cityRow?.id ?? null, category, bio,
    }).select().single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSellerId(data.id);
    setStep(2);
  };

  const submitStep2 = async () => {
    if (!profileUrl) { setErrors({ profileUrl: "A profile photo is required" }); return; }
    setErrors({});
    if (!sellerId) return;
    setBusy(true);
    const { error } = await supabase.from("sellers")
      .update({ profile_photo_url: profileUrl, cover_photo_url: coverUrl })
      .eq("id", sellerId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-xl px-5 py-8">
        {step === 1 && <div className="mb-6"><BackButton fallback="/" /></div>}

        {step < 3 && (
          <>
            <h1 className="font-serif text-3xl">Fara Kasuwanci — Start Your Store</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Welcome to the community · Step {step} of 2
            </p>

            <div className="mt-4 flex gap-1.5">
              {[1, 2].map((n) => (
                <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= n ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </>
        )}

        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-warm">

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-serif text-xl">Business info</h2>

              <div>
                <Label>Business name *</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Zainab's Kitchen" />
                <FieldError msg={errors.businessName} />
              </div>

              <div>
                <Label>Your name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zainab Musa" />
                <FieldError msg={errors.name} />
              </div>

              <div>
                <Label>WhatsApp number *</Label>
                <Input placeholder="+234… or 0801…" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                <FieldError msg={errors.whatsapp} />
              </div>

              <div>
                <Label>City *</Label>
                <Select value={city} onValueChange={(v) => { setCity(v); if (v !== "Other") setOtherCity(""); }}>
                  <SelectTrigger className={errors.city ? "border-destructive" : ""}>
                    <SelectValue placeholder="Choose city" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.city} />
                {city === "Other" && (
                  <Input autoFocus placeholder="Type your city" value={otherCity}
                    onChange={(e) => setOtherCity(e.target.value)} className="mt-2" />
                )}
                <FieldError msg={errors.otherCity} />
              </div>

              <div>
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.category} />
              </div>

              <div>
                <Label>Short bio (max 150 chars)</Label>
                <Textarea maxLength={150} value={bio} onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell customers what you sell…" />
                <p className="mt-1 text-right text-xs text-muted-foreground">{bio.length}/150</p>
              </div>

              <Button onClick={submitStep1} disabled={busy}
                className="w-full rounded-full bg-primary py-6 text-base text-primary-foreground hover:bg-primary/90">
                {busy
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                  : <>Next — Upload photos <ChevronRight className="ml-1.5 h-4 w-4" /></>}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-serif text-xl">Upload photos</h2>

              <ImageUploader
                value={profileUrl}
                onChange={setProfileUrl}
                aspect={1}
                shape="circle"
                pathPrefix="profile"
                label="Profile photo *"
              />
              <FieldError msg={errors.profileUrl} />

              <ImageUploader
                value={coverUrl}
                onChange={setCoverUrl}
                aspect={16 / 9}
                pathPrefix="cover"
                label="Cover photo (optional)"
              />

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-full">
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <Button onClick={submitStep2} disabled={busy} className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {busy
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                    : <>Submit application <ChevronRight className="ml-1 h-4 w-4" /></>}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Clock className="h-8 w-8" />
              </div>
              <h2 className="font-serif text-2xl">Your application has been submitted</h2>
              <p className="text-sm text-muted-foreground">
                Thank you! Your store is now <strong>under review</strong> by our admin team.
              </p>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
                <p className="font-semibold">What happens next</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>An admin will review your application (usually within 24–48 hours).</li>
                  <li>You'll receive an in-app notice once a decision is made.</li>
                  <li>Once approved, you'll be able to add products and your store will go live.</li>
                </ul>
                <p className="mt-3 font-semibold">In the meantime</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>You can edit your profile and re-upload photos.</li>
                  <li>You <strong>cannot</strong> publish products until your store is approved.</li>
                </ul>
              </div>
              <Link to="/" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90">
                <Home className="h-4 w-4" /> Return to homepage
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
