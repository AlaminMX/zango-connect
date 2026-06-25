/**
 * register.tsx — Seller registration with inline account creation.
 * Step 1: business info + email + password (collected only if not signed in).
 * Step 2: profile/cover photos.
 * Step 3: confirmation that the store is under review.
 * No /auth redirect — registration is reachable by everyone.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploader } from "@/components/ImageUploader";
import { toast } from "sonner";
import { slugify, validateNigerianPhone } from "@/lib/whatsapp";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, Clock, Home, Check, Compass, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/register")({ component: Register });

// ---------------------------------------------------------------------------
// Nigeria — 6 Geopolitical Zones + FCT (state capitals / major cities)
// ---------------------------------------------------------------------------
export const NIGERIA_ZONE_CITIES: Record<string, string[]> = {
  "FCT": ["Abuja"],
  "North Central": ["Ilorin", "Lafia", "Lokoja", "Minna", "Jos"],
  "North East": ["Bauchi", "Damaturu", "Gombe", "Jalingo", "Maiduguri", "Yola"],
  "North West": ["Birnin Kebbi", "Dutse", "Gusau", "Kaduna", "Kano", "Katsina", "Sokoto"],
  "South East": ["Abakaliki", "Awka", "Enugu", "Owerri", "Umuahia"],
  "South South": ["Asaba", "Benin City", "Calabar", "Port Harcourt", "Uyo", "Yenagoa"],
  "South West": ["Ado Ekiti", "Abeokuta", "Akure", "Ibadan", "Lagos", "Osogbo"],
};

// Flat sorted list for quick validation
export const ALL_ZONE_CITIES: string[] = Object.values(NIGERIA_ZONE_CITIES).flat().sort((a, b) => a.localeCompare(b));

// ---------------------------------------------------------------------------

type Errors = Record<string, string>;

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3" /> {msg}
    </p>
  );
}

function Req() {
  return <span className="text-primary"> *</span>;
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sage-deep">
      {children}
    </p>
  );
}

function Register() {
  const [userId, setUserId] = useState<string | null>(null);
  const [hasAccount, setHasAccount] = useState(false);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  // Step 1 — auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 1 — business
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");

  // Step 2
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const [categories, setCategories] = useState<{ name: string }[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        setHasAccount(true);
        const { data: existing } = await supabase
          .from("sellers")
          .select("id, profile_photo_url, cover_photo_url")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (existing) {
          setSellerId(existing.id);
          setProfileUrl(existing.profile_photo_url ?? null);
          setCoverUrl(existing.cover_photo_url ?? null);
          setStep(existing.profile_photo_url ? 3 : 2);
        }
      }
    });
    supabase.from("categories").select("name").order("sort_order").then(({ data }) => setCategories(data ?? []));
  }, []);

  const validateStep1 = (): Errors => {
    const e: Errors = {};
    if (!hasAccount) {
      if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email";
      if (!password || password.length < 6) e.password = "Password must be at least 6 characters";
    }
    if (!businessName.trim()) e.businessName = "Business name is required";
    if (!name.trim()) e.name = "Your name is required";
    if (!whatsapp.trim()) e.whatsapp = "WhatsApp number is required";
    else { const c = validateNigerianPhone(whatsapp); if (!c.valid) e.whatsapp = c.error ?? "Invalid phone number"; }
    if (!city) e.city = "Please choose a city";
    if (!category) e.category = "Please choose a category";
    return e;
  };

  const submitStep1 = async () => {
    const errs = validateStep1();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setBusy(true);

    let uid = userId;

    if (!hasAccount) {
      const { data: signUp, error: signErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signErr) {
        if (signErr.message.toLowerCase().includes("registered") || signErr.message.toLowerCase().includes("exists")) {
          const { data: signIn, error: inErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (inErr || !signIn.user) {
            setBusy(false);
            setErrors({ email: "An account exists for this email. The password didn't match." });
            return;
          }
          uid = signIn.user.id;
        } else {
          setBusy(false);
          toast.error(signErr.message);
          return;
        }
      } else if (signUp.user) {
        uid = signUp.user.id;
      }

      if (!uid) {
        setBusy(false);
        toast.error("Couldn't create your account. Please try again.");
        return;
      }
      setUserId(uid);
      setHasAccount(true);

      const { data: existing } = await supabase
        .from("sellers")
        .select("id, profile_photo_url, cover_photo_url")
        .eq("user_id", uid)
        .maybeSingle();
      if (existing) {
        setSellerId(existing.id);
        setProfileUrl(existing.profile_photo_url ?? null);
        setCoverUrl(existing.cover_photo_url ?? null);
        setBusy(false);
        setStep(existing.profile_photo_url ? 3 : 2);
        return;
      }
    }

    const baseSlug = slugify(businessName);
    let slug = baseSlug;
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await supabase.from("sellers").select("id").eq("slug", slug).maybeSingle();
      if (!clash) break;
      slug = `${baseSlug}-${Math.floor(Math.random() * 999)}`;
    }
    const { data: cityRow } = await supabase
      .from("cities_of_business").select("id").ilike("name", city).maybeSingle();
    const { data, error } = await supabase.from("sellers").insert({
      user_id: uid!, name, business_name: businessName.trim(), slug,
      whatsapp_number: whatsapp, city, city_id: cityRow?.id ?? null, category, bio,
      verification_status: "pending",
      is_blocked: false,
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

  const stepState = (n: number): "done" | "current" | "upcoming" =>
    step > n ? "done" : step === n ? "current" : "upcoming";

  const pillCls = (n: number) => {
    const s = stepState(n);
    return `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
      s === "current" ? "bg-primary text-primary-foreground" :
      s === "done" ? "bg-sage/15 text-sage-deep" :
      "bg-muted text-muted-foreground"
    }`;
  };

  const dotCls = (n: number) => {
    const s = stepState(n);
    return `flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-semibold ${
      s === "current" ? "bg-primary-foreground text-primary" :
      s === "done" ? "bg-sage-deep text-white" :
      "bg-border-warm text-muted-foreground"
    }`;
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-xl px-5 py-8">
        {step === 1 && <div className="mb-6"><BackButton fallback="/" /></div>}

        {step < 3 && (
          <>
            <h1 className="font-serif text-3xl">Fara Kasuwanci — Start Your Store</h1>
            <p className="mt-1 text-sm text-muted-foreground">Welcome to the community</p>

            <div className="mt-4 flex items-center gap-2">
              <div className={pillCls(1)}>
                <span className={dotCls(1)}>{stepState(1) === "done" ? <Check className="h-3 w-3" /> : "1"}</span>
                Business info
              </div>
              <div className={`h-px flex-1 ${stepState(1) === "done" ? "bg-sage-deep/40" : "bg-border"}`} />
              <div className={pillCls(2)}>
                <span className={dotCls(2)}>{stepState(2) === "done" ? <Check className="h-3 w-3" /> : "2"}</span>
                Photos
              </div>
            </div>
          </>
        )}

        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-warm">

          {step === 1 && (
            <div className="space-y-4">
              {!hasAccount && (
                <>
                  <SectionEyebrow>Account</SectionEyebrow>
                  <h2 className="-mt-1 font-serif text-xl">Your login</h2>
                  <p className="-mt-2 text-xs text-muted-foreground">
                    We'll create your seller account so you can manage your store later.
                  </p>
                  <div>
                    <Label>Email<Req /></Label>
                    <Input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                    <FieldError msg={errors.email} />
                  </div>
                  <div>
                    <Label>Password<Req /></Label>
                    <PasswordInput
                      minLength={6}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                    <FieldError msg={errors.password} />
                  </div>
                  <div className="my-2 h-px bg-border" />
                </>
              )}

              <SectionEyebrow>Business details</SectionEyebrow>
              <h2 className="-mt-1 font-serif text-xl">Business info</h2>

              <div>
                <Label>Business name<Req /></Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Zainab's Kitchen" />
                <FieldError msg={errors.businessName} />
              </div>

              <div>
                <Label>Your name<Req /></Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zainab Musa" />
                <FieldError msg={errors.name} />
              </div>

              <div>
                <Label>WhatsApp number<Req /></Label>
                <Input placeholder="+234… or 0801…" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                <FieldError msg={errors.whatsapp} />
              </div>

              {/* City — fixed list of Nigerian state capitals by geopolitical zone */}
              <div>
                <Label>City<Req /></Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className={errors.city ? "border-destructive" : ""}>
                    <SelectValue placeholder="Choose your city" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NIGERIA_ZONE_CITIES).map(([zone, cities]) => (
                      <div key={zone}>
                        <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {zone}
                        </div>
                        {cities.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.city} />
              </div>

              <div>
                <Label>Category<Req /></Label>
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

              <div>
                <ImageUploader
                  value={profileUrl}
                  onChange={setProfileUrl}
                  aspect={1}
                  shape="circle"
                  pathPrefix="profile"
                  label="Profile photo *"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">This is the first thing buyers see.</p>
                <FieldError msg={errors.profileUrl} />
              </div>

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
              <h2 className="font-serif text-2xl">Application submitted!</h2>
              <p className="text-sm text-muted-foreground">
                Thank you for registering. Your business is currently <strong>under review</strong>.
              </p>

              {/* ── Updated message — WhatsApp notification, no in-app mention ── */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
                <div className="flex items-start gap-2.5">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold">What happens next?</p>
                    <p className="mt-1 leading-relaxed">
                      Once your registration has been fully reviewed and approved, you will receive a
                      <strong> WhatsApp notification</strong> from the admin. Please ensure your
                      WhatsApp number is active and reachable.
                    </p>
                  </div>
                </div>
              </div>

              <Link to="/" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90">
                <Home className="h-4 w-4" /> Return to homepage
              </Link>
              <Link to="/explore" className="inline-flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                While you wait, explore the marketplace <Compass className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
