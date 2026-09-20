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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "@/components/ImageUploader";
import { toast } from "sonner";
import { slugify, validateNigerianPhone } from "@/lib/whatsapp";
import { humanizeError } from "@/lib/error-messages";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
  MessageCircle,
  Mail,
  KeyRound,
} from "lucide-react";
import { listActiveStates, listCitiesForState } from "@/lib/states.functions";

export const Route = createFileRoute("/register")({ component: Register });

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

  // Account conflict resolution state (for accounts where auth user exists e.g. deleted vendor)
  const [accountConflict, setAccountConflict] = useState<{
    email: string;
    attemptedPassword?: string;
  } | null>(null);
  const [conflictPassword, setConflictPassword] = useState("");
  const [conflictBusy, setConflictBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Step 1 — business
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [area, setArea] = useState("");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [areaSelectValue, setAreaSelectValue] = useState("");
  const [isOtherArea, setIsOtherArea] = useState(false);
  const [customArea, setCustomArea] = useState("");
  const [bio, setBio] = useState("");

  const [selectedState, setSelectedState] = useState("");

  // Step 2
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const [states, setStates] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [areas, setAreas] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);

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
    listActiveStates()
      .then((rows) =>
        setStates((rows ?? []).map((s: any) => ({ id: s.id, name: s.name, slug: s.slug }))),
      )
      .catch(() => toast.error("Could not load states."));
  }, []);

  useEffect(() => {
    const state = states.find((s) => s.name === selectedState);
    setArea("");
    setAreaId(null);
    setAreaSelectValue("");
    setIsOtherArea(false);
    setCustomArea("");
    setAreas([]);
    if (!state) return;
    setAreasLoading(true);
    listCitiesForState({ data: { slug: state.slug } })
      .then((result) =>
        setAreas(
          (result?.cities ?? []).map((a: any) => ({ id: a.id, name: a.name, slug: a.slug })),
        ),
      )
      .catch(() => toast.error("Could not load areas for this state."))
      .finally(() => setAreasLoading(false));
  }, [selectedState, states]);

  const effectiveArea = () => (isOtherArea ? customArea.trim() : area);

  const validateStep1 = (): Errors => {
    const e: Errors = {};
    if (!hasAccount) {
      if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email";
      if (!password || password.length < 6) e.password = "Password must be at least 6 characters";
    }
    if (!businessName.trim()) e.businessName = "Business name is required";
    if (!name.trim()) e.name = "Your name is required";
    if (!whatsapp.trim()) e.whatsapp = "WhatsApp number is required";
    else {
      const c = validateNigerianPhone(whatsapp);
      if (!c.valid) e.whatsapp = c.error ?? "Invalid phone number";
    }
    if (!selectedState) e.state = "Please choose a state";
    if (!effectiveArea()) e.area = isOtherArea ? "Please type your area" : "Please choose an area";
    return e;
  };

  const saveSellerStep1 = async (targetUid: string) => {
    const baseSlug = slugify(businessName);
    let slug = baseSlug;
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await supabase
        .from("sellers")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${baseSlug}-${Math.floor(Math.random() * 999)}`;
    }
    const finalArea = effectiveArea();
    let resolvedAreaId = areaId;

    if (isOtherArea && finalArea) {
      // New area typed by the vendor and not in our curated list — create it
      // (or find it if another vendor already typed the same name/state).
      const { data: newAreaId, error: ensureErr } = await supabase.rpc("ensure_area", {
        _name: finalArea,
        _state: selectedState,
      });
      if (ensureErr || !newAreaId) {
        setBusy(false);
        toast.error("Couldn't save that area. Please try again.");
        return;
      }
      resolvedAreaId = newAreaId as string;
    } else if (!resolvedAreaId && finalArea) {
      const { data: areaRow } = await supabase
        .from("cities_of_business")
        .select("id")
        .eq("state", selectedState)
        .ilike("name", finalArea)
        .maybeSingle();
      resolvedAreaId = areaRow?.id ?? null;
    }
    const { data, error } = await supabase
      .from("sellers")
      .insert({
        user_id: targetUid,
        name,
        business_name: businessName.trim(),
        slug,
        whatsapp_number: whatsapp,
        city: finalArea,
        state: selectedState,
        city_id: resolvedAreaId,
        bio,
        verification_status: "pending",
        onboarding_status: "step1_complete",
        is_blocked: false,
      })
      .select()
      .single();

    setBusy(false);
    if (error) {
      toast.error(humanizeError(error.message));
      return;
    }
    setSellerId(data.id);
    toast.success("Business information saved.");
    setStep(2);
  };

  const handleVerifyExistingPassword = async () => {
    const targetEmail = accountConflict?.email || email.trim();
    if (!targetEmail || !conflictPassword) return;
    setConflictBusy(true);

    const { data: signIn, error: inErr } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: conflictPassword,
    });

    if (inErr || !signIn.user) {
      setConflictBusy(false);
      toast.error(inErr?.message || "Incorrect password. Please check and try again.");
      return;
    }

    const uid = signIn.user.id;
    setUserId(uid);
    setHasAccount(true);
    setAccountConflict(null);
    setErrors({});

    // If user specified a new password in the form, smoothly update it
    if (password && password !== conflictPassword && password.length >= 6) {
      try {
        await supabase.auth.updateUser({ password });
      } catch {
        // non-blocking
      }
    }

    // Check if seller profile already exists
    const { data: existing } = await supabase
      .from("sellers")
      .select("id, profile_photo_url, cover_photo_url")
      .eq("user_id", uid)
      .maybeSingle();

    if (existing) {
      setSellerId(existing.id);
      setProfileUrl(existing.profile_photo_url ?? null);
      setCoverUrl(existing.cover_photo_url ?? null);
      setConflictBusy(false);
      setBusy(false);
      setStep(existing.profile_photo_url ? 3 : 2);
      toast.success("Account connected! Resuming store onboarding.");
      return;
    }

    // Clean slate (e.g. deleted vendor re-registering) — save step 1 details now
    setConflictBusy(false);
    setBusy(true);
    await saveSellerStep1(uid);
  };

  const handleSendPasswordReset = async () => {
    const targetEmail = accountConflict?.email || email.trim();
    if (!targetEmail) return;
    setConflictBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setConflictBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      setResetSent(true);
      toast.success(`Password reset link sent to ${targetEmail}`);
    }
  };

  const submitStep1 = async () => {
    const errs = validateStep1();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);

    let uid = userId;

    if (!hasAccount) {
      const { data: signUp, error: signErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signErr) {
        const isRegistered =
          signErr.message.toLowerCase().includes("registered") ||
          signErr.message.toLowerCase().includes("exists") ||
          ("status" in signErr && (signErr as { status?: number }).status === 422);

        if (isRegistered) {
          // Email exists in Auth (e.g. from previously deleted vendor or prior account).
          // Attempt silent sign-in with the password provided:
          const { data: signIn, error: inErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (inErr || !signIn.user) {
            // Password didn't match the old account password.
            // Provide friendly, non-blocking inline resolution:
            setBusy(false);
            setAccountConflict({ email: email.trim(), attemptedPassword: password });
            return;
          }

          // Password matched! Use this user
          uid = signIn.user.id;
          toast.info("Account recognized! Linking to your store.");
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
        toast.info("Welcome back! Resuming your store setup.");
        return;
      }
    }

    if (!uid) {
      setBusy(false);
      toast.error("Session error. Please try again.");
      return;
    }

    await saveSellerStep1(uid);
  };

  const submitStep2 = async () => {
    if (!profileUrl) {
      setErrors({ profileUrl: "A profile photo is required" });
      return;
    }
    setErrors({});
    if (!sellerId) return;
    setBusy(true);
    const { error } = await supabase
      .from("sellers")
      .update({
        profile_photo_url: profileUrl,
        cover_photo_url: coverUrl,
        onboarding_status: "step2_complete",
      })
      .eq("id", sellerId);
    setBusy(false);
    if (error) {
      toast.error(humanizeError(error.message));
      return;
    }
    toast.success("Photos uploaded. Your store is now under review.");
    setStep(3);
  };

  const stepState = (n: number): "done" | "current" | "upcoming" =>
    step > n ? "done" : step === n ? "current" : "upcoming";

  const pillCls = (n: number) => {
    const s = stepState(n);
    return `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
      s === "current"
        ? "bg-primary text-primary-foreground"
        : s === "done"
          ? "bg-sage/15 text-sage-deep"
          : "bg-muted text-muted-foreground"
    }`;
  };

  const dotCls = (n: number) => {
    const s = stepState(n);
    return `flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-semibold ${
      s === "current"
        ? "bg-primary-foreground text-primary"
        : s === "done"
          ? "bg-sage-deep text-white"
          : "bg-border-warm text-muted-foreground"
    }`;
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-xl px-5 py-8">
        {step === 1 && (
          <div className="mb-6">
            <BackButton fallback="/" />
          </div>
        )}

        {step < 3 && (
          <>
            <div className="flex items-baseline justify-between gap-4 mb-6">
              <div>
                <h1 className="font-serif text-3xl">Fara Kasuwanci — Start Your Store</h1>
                <p className="mt-1 text-sm text-muted-foreground">Welcome to the community</p>
              </div>
              {step === 1 && (
                <Link
                  to="/auth"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-primary-foreground whitespace-nowrap"
                >
                  Already have an account? Sign in
                </Link>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className={pillCls(1)}>
                <span className={dotCls(1)}>
                  {stepState(1) === "done" ? <Check className="h-3 w-3" /> : "1"}
                </span>
                Business info
              </div>
              <div
                className={`h-px flex-1 ${stepState(1) === "done" ? "bg-sage-deep/40" : "bg-border"}`}
              />
              <div className={pillCls(2)}>
                <span className={dotCls(2)}>
                  {stepState(2) === "done" ? <Check className="h-3 w-3" /> : "2"}
                </span>
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
                    <Label>
                      Email
                      <Req />
                    </Label>
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
                    <Label>
                      Password
                      <Req />
                    </Label>
                    <PasswordInput
                      minLength={6}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                    <FieldError msg={errors.password} />
                  </div>

                  {accountConflict && !hasAccount && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-5 text-sm shadow-sm space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div className="space-y-1">
                          <p className="font-semibold text-amber-950">
                            Account already exists for {accountConflict.email}
                          </p>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            If your previous vendor profile was deleted or you already have an account, enter your account password below to link this email to your new store, or request a password reset.
                          </p>
                        </div>
                      </div>

                      {resetSent ? (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
                          <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-emerald-950">Password reset link sent!</p>
                            <p className="mt-0.5 text-emerald-800">
                              Check your inbox at <strong>{accountConflict.email}</strong>. Once reset, return here and enter your new password to link your store.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-1">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-amber-950">
                              Enter account password to link & continue:
                            </Label>
                            <div className="flex gap-2">
                              <PasswordInput
                                value={conflictPassword}
                                onChange={(e) => setConflictPassword(e.target.value)}
                                placeholder="Your account password"
                                className="bg-white text-xs h-10"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleVerifyExistingPassword();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                onClick={handleVerifyExistingPassword}
                                disabled={conflictBusy || !conflictPassword}
                                className="shrink-0 rounded-full px-4 text-xs font-semibold bg-amber-900 text-amber-50 hover:bg-amber-800"
                              >
                                {conflictBusy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Link & Continue"
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-amber-200 text-xs">
                            <button
                              type="button"
                              onClick={handleSendPasswordReset}
                              disabled={conflictBusy}
                              className="font-medium text-amber-900 hover:underline inline-flex items-center gap-1.5"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              Send password reset link to this email
                            </button>
                            <span className="text-amber-400">•</span>
                            <Link
                              to="/auth"
                              className="font-medium text-amber-900 hover:underline"
                            >
                              Sign in to existing account
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="my-2 h-px bg-border" />
                </>
              )}

              <SectionEyebrow>Business details</SectionEyebrow>
              <h2 className="-mt-1 font-serif text-xl">Business info</h2>

              <div>
                <Label>
                  Business name
                  <Req />
                </Label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Zainab's Kitchen"
                />
                <FieldError msg={errors.businessName} />
              </div>

              <div>
                <Label>
                  Your name
                  <Req />
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Zainab Musa"
                />
                <FieldError msg={errors.name} />
              </div>

              <div>
                <Label>
                  WhatsApp number
                  <Req />
                </Label>
                <Input
                  placeholder="+234… or 0801…"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
                <FieldError msg={errors.whatsapp} />
              </div>

              {/* State → Area two-level selector */}
              <div>
                <Label>
                  State of Business
                  <Req />
                </Label>
                <Select
                  value={selectedState}
                  onValueChange={(v) => {
                    setSelectedState(v);
                    setArea("");
                    setAreaId(null);
                  }}
                >
                  <SelectTrigger className={errors.state ? "border-destructive" : ""}>
                    <SelectValue placeholder="Choose your state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>
                  Area of Business
                  <Req />
                </Label>
                <Select
                  value={areaSelectValue}
                  disabled={!selectedState || areasLoading}
                  onValueChange={(v) => {
                    setAreaSelectValue(v);
                    if (v === "__other__") {
                      setIsOtherArea(true);
                      setArea("");
                      setAreaId(null);
                    } else {
                      setIsOtherArea(false);
                      setCustomArea("");
                      setArea(v);
                      setAreaId(areas.find((a) => a.name === v)?.id ?? null);
                    }
                  }}
                >
                  <SelectTrigger className={errors.area ? "border-destructive" : ""}>
                    <SelectValue
                      placeholder={
                        !selectedState
                          ? "Choose a state first"
                          : areasLoading
                            ? "Loading areas…"
                            : "Choose your area"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.name}>
                        {a.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__other__">Other — my area isn't listed</SelectItem>
                  </SelectContent>
                </Select>
                {isOtherArea && (
                  <Input
                    className={`mt-2 ${errors.area ? "border-destructive" : ""}`}
                    placeholder="Type your area, e.g. Sabon Gari"
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value)}
                  />
                )}
                <FieldError msg={errors.state} />
                <FieldError msg={errors.area} />
              </div>

              <div>
                <Label>Short bio (max 150 chars)</Label>
                <Textarea
                  maxLength={150}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell customers what you sell…"
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">{bio.length}/150</p>
              </div>

              <Button
                onClick={submitStep1}
                disabled={busy}
                className="w-full rounded-full bg-primary py-6 text-base text-primary-foreground hover:bg-primary/90"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    Next — Upload photos <ChevronRight className="ml-1.5 h-4 w-4" />
                  </>
                )}
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
                <p className="mt-1.5 text-xs text-muted-foreground">
                  This is the first thing buyers see.
                </p>
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
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-full"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <Button
                  onClick={submitStep2}
                  disabled={busy}
                  className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    <>
                      Submit application <ChevronRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="relative -m-6 overflow-hidden rounded-2xl">
              {/* Warm arrival backdrop — echoes the coming-soon gradient so this feels
                  like a distinct, celebratory moment rather than a form-step */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#FBF3E4] via-card to-card" />
              <div className="pointer-events-none absolute -top-16 -right-14 h-48 w-48 rounded-full bg-sage/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-14 h-52 w-52 rounded-full bg-primary/15 blur-3xl" />

              <div className="relative space-y-7 px-6 py-10 text-center">
                {/* Success badge — soft pulse instead of a static clock, reads as
                    "in motion" rather than "waiting" */}
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-primary/15 animate-ping [animation-duration:2.2s]" />
                  <span className="absolute inset-2.5 rounded-full bg-primary/10" />
                  <div className="relative flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <Check className="h-6 w-6" />
                  </div>
                </div>

                <div>
                  <h2 className="font-serif text-2xl text-espresso">You're on the list</h2>
                  <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    {businessName ? <strong>{businessName}</strong> : "Your store"} has been
                    submitted. Every application gets a real look from our team — we'll be in touch
                    soon.
                  </p>
                </div>

                {/* Where-you-are tracker — a real sequence, so numbered stages earn their
                    place here (mirrors the pill styling used in steps 1–2 above) */}
                <div className="mx-auto flex max-w-[19rem] items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sage-deep text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[11px] font-medium text-espresso">Submitted</span>
                  </div>
                  <div className="mx-1.5 h-px flex-1 bg-sage-deep/40" />
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold animate-pulse [animation-duration:2.2s]">
                      2
                    </span>
                    <span className="text-[11px] font-medium text-primary">Under review</span>
                  </div>
                  <div className="mx-1.5 h-px flex-1 bg-border-warm" />
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-border-warm text-[10px] font-semibold text-muted-foreground">
                      3
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">Approved</span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
                  <div className="flex items-start gap-2.5">
                    <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-semibold">What happens next?</p>
                      <p className="mt-1 leading-relaxed">
                        Once your registration has been fully reviewed and approved, you will
                        receive a<strong> WhatsApp notification</strong> from the admin. Please
                        ensure your WhatsApp number is active and reachable.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  You're free to close this tab — we'll reach you on WhatsApp the moment there's an
                  update.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
