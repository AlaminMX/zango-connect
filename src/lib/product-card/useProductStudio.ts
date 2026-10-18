import * as React from "react";
import type {
  ProductCardFormat,
  ProductCardThemeName,
  ProductCardCustomization,
  QuickTemplateId,
} from "./types";
import { quickTemplates } from "./templates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UseProductStudioOptions {
  sellerId?: string;
  initialFormat?: ProductCardFormat;
  initialTheme?: ProductCardThemeName;
  initialVariation?: number;
  initialShowWhatsApp?: boolean;
  initialShowVerified?: boolean;
  initialShowStock?: boolean;
  initialShowQRCode?: boolean;
  initialShowQRCode?: boolean;
  initialTagline?: string;
  initialFramingMode?: "hero-75" | "full-bleed";
}

export function useProductStudio(options: UseProductStudioOptions = {}) {
  const {
    sellerId,
    initialFormat = "whatsapp-status",
    initialTheme = "zango-signature",
    initialVariation = 0,
    initialShowWhatsApp = true,
    initialShowVerified = true,
    initialShowStock = true,
    initialShowQRCode = true,
    initialTagline = "",
    initialFramingMode = "hero-75",
  } = options;

  const storageKey = React.useMemo(() => {
    return sellerId ? `zango_product_studio_pref_${sellerId}` : "zango_product_studio_pref_default";
  }, [sellerId]);

  const draftKey = React.useMemo(() => {
    return sellerId
      ? `zango_product_studio_draft_${sellerId}`
      : "zango_product_studio_draft_default";
  }, [sellerId]);

  // Load initial customization: Prioritize Draft -> Saved Prefs -> Defaults
  const [preferences, setPreferences] = React.useState<ProductCardCustomization>(() => {
    if (typeof window !== "undefined") {
      try {
        // 1. Try draft first (work in progress)
        const draftRaw = localStorage.getItem(draftKey);
        if (draftRaw) {
          const parsed = JSON.parse(draftRaw);
          return {
            format: (parsed.format as ProductCardFormat) || initialFormat,
            theme: (parsed.theme as ProductCardThemeName) || initialTheme,
            variation: typeof parsed.variation === "number" ? parsed.variation : initialVariation,
            framingMode: parsed.framingMode || initialFramingMode,
            showWhatsAppBadge: parsed.showWhatsAppBadge ?? initialShowWhatsApp,
            showVerifiedBadge: parsed.showVerifiedBadge ?? initialShowVerified,
            showStockBadge: parsed.showStockBadge ?? initialShowStock,
            showQRCode: parsed.showQRCode ?? initialShowQRCode,
            customTagline: parsed.customTagline ?? initialTagline,
          };
        }
        // 2. Try saved baseline preferences
        const prefRaw = localStorage.getItem(storageKey);
        if (prefRaw) {
          const parsed = JSON.parse(prefRaw);
          return {
            format: (parsed.format as ProductCardFormat) || initialFormat,
            theme: (parsed.theme as ProductCardThemeName) || initialTheme,
            variation: typeof parsed.variation === "number" ? parsed.variation : initialVariation,
            framingMode: parsed.framingMode || initialFramingMode,
            showWhatsAppBadge: parsed.showWhatsAppBadge ?? initialShowWhatsApp,
            showVerifiedBadge: parsed.showVerifiedBadge ?? initialShowVerified,
            showStockBadge: parsed.showStockBadge ?? initialShowStock,
            showQRCode: parsed.showQRCode ?? initialShowQRCode,
            customTagline: parsed.customTagline ?? initialTagline,
          };
        }
      } catch (e) {
        console.warn("[useProductStudio] Failed to read cached draft/preferences:", e);
      }
    }
    return {
      format: initialFormat,
      theme: initialTheme,
      variation: initialVariation,
      framingMode: initialFramingMode,
      showWhatsAppBadge: initialShowWhatsApp,
      showVerifiedBadge: initialShowVerified,
      showStockBadge: initialShowStock,
      showQRCode: initialShowQRCode,
      customTagline: initialTagline,
    };
  });

  const [hasDraft, setHasDraft] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(localStorage.getItem(draftKey));
  });

  const [activeTemplate, setActiveTemplate] = React.useState<QuickTemplateId | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = React.useState(false);

  // Background hydration from Supabase User Profile Draft
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const cloudDraft = session?.user?.user_metadata?.card_studio_draft as
          ProductCardCustomization | undefined;
        if (!cancelled && cloudDraft && typeof cloudDraft === "object") {
          // If local draft doesn't exist, hydrate from cloud
          if (typeof window !== "undefined" && !localStorage.getItem(draftKey)) {
            setPreferences((prev) => ({
              ...prev,
              ...cloudDraft,
            }));
            setHasDraft(true);
            try {
              localStorage.setItem(draftKey, JSON.stringify(cloudDraft));
            } catch (storageErr) {
              console.warn("[useProductStudio] Cloud draft cache failed:", storageErr);
            }
          }
        }
      } catch (cloudErr) {
        console.warn("[useProductStudio] Cloud draft lookup skipped:", cloudErr);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  // Autosave draft to local storage + debounced cloud sync to Supabase user profile
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Instant local storage draft persistence
    try {
      localStorage.setItem(draftKey, JSON.stringify(preferences));
      setHasDraft(true);
    } catch (e) {
      console.warn("[useProductStudio] Draft local autosave failed:", e);
    }

    // 2. Debounced sync to Supabase profile metadata
    const timer = setTimeout(async () => {
      try {
        setIsCloudSyncing(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.auth.updateUser({
            data: {
              card_studio_draft: preferences,
              card_studio_draft_updated_at: new Date().toISOString(),
            },
          });
        }
      } catch (err) {
        // Ignored in offline / guest mode
      } finally {
        setIsCloudSyncing(false);
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [preferences, draftKey]);

  // Setters
  const setFormat = React.useCallback((format: ProductCardFormat) => {
    setActiveTemplate(null);
    setPreferences((prev) => ({ ...prev, format }));
  }, []);

  const setTheme = React.useCallback((theme: ProductCardThemeName) => {
    setActiveTemplate(null);
    setPreferences((prev) => ({ ...prev, theme }));
  }, []);

  const setVariation = React.useCallback((variation: number) => {
    setActiveTemplate(null);
    setPreferences((prev) => ({ ...prev, variation }));
  }, []);

  const regenerateVariation = React.useCallback(() => {
    setActiveTemplate(null);
    setPreferences((prev) => ({
      ...prev,
      variation: (prev.variation + 1) % 3,
    }));
  }, []);

  const toggleWhatsAppBadge = React.useCallback(() => {
    setActiveTemplate(null);
    setPreferences((prev) => ({ ...prev, showWhatsAppBadge: !prev.showWhatsAppBadge }));
  }, []);

  const toggleVerifiedBadge = React.useCallback(() => {
    setActiveTemplate(null);
    setPreferences((prev) => ({ ...prev, showVerifiedBadge: !prev.showVerifiedBadge }));
  }, []);

  const toggleStockBadge = React.useCallback(() => {
    setActiveTemplate(null);
    setPreferences((prev) => ({ ...prev, showStockBadge: !prev.showStockBadge }));
  }, []);

  const toggleQRCode = React.useCallback(() => {
    setActiveTemplate(null);
    setPreferences((prev) => ({ ...prev, showQRCode: !prev.showQRCode }));
  }, []);

  const setFramingMode = React.useCallback((framingMode: "hero-75" | "full-bleed") => {
    setActiveTemplate(null);
    setPreferences((prev) => ({ ...prev, framingMode }));
  }, []);

  const setCustomTagline = React.useCallback((customTagline: string) => {
    setActiveTemplate(null);
    setPreferences((prev) => ({ ...prev, customTagline }));
  }, []);

  // Quick Template One-Click Application
  const applyTemplate = React.useCallback((templateId: QuickTemplateId) => {
    const tmpl = quickTemplates[templateId];
    if (!tmpl) return;

    setActiveTemplate(templateId);
    setPreferences((prev) => ({
      ...prev,
      theme: tmpl.theme,
      variation: tmpl.variation,
      showWhatsAppBadge: tmpl.showWhatsAppBadge,
      showVerifiedBadge: tmpl.showVerifiedBadge,
      showStockBadge: tmpl.showStockBadge,
      showQRCode: tmpl.showQRCode,
      customTagline: tmpl.customTagline,
      ...(tmpl.format ? { format: tmpl.format } : {}),
    }));

    toast.success(`Applied "${tmpl.name}" template`, {
      description: tmpl.subtitle,
      duration: 2200,
    });
  }, []);

  // Save baseline preferences for logged in vendor
  const savePreferences = React.useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(preferences));
        toast.success("Marketing card preferences saved as vendor default!");
        return true;
      } catch (err) {
        console.error("[useProductStudio] Save failed:", err);
        toast.error("Could not save card preferences");
        return false;
      }
    }
    return false;
  }, [preferences, storageKey]);

  // Discard draft and revert to saved baseline or defaults
  const discardDraft = React.useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(draftKey);
      } catch (err) {
        console.warn("[useProductStudio] remove draft error:", err);
      }
    }

    let fallback = {
      format: initialFormat,
      theme: initialTheme,
      variation: initialVariation,
      showWhatsAppBadge: initialShowWhatsApp,
      showVerifiedBadge: initialShowVerified,
      showStockBadge: initialShowStock,
      showQRCode: initialShowQRCode,
      customTagline: initialTagline,
    };

    if (typeof window !== "undefined") {
      try {
        const rawSaved = localStorage.getItem(storageKey);
        if (rawSaved) {
          fallback = { ...fallback, ...JSON.parse(rawSaved) };
        }
      } catch (err) {
        console.warn("[useProductStudio] fallback read error:", err);
      }
    }

    setPreferences(fallback);
    setHasDraft(false);
    setActiveTemplate(null);

    // Also clear cloud draft
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.auth
          .updateUser({
            data: {
              card_studio_draft: null,
              card_studio_draft_updated_at: new Date().toISOString(),
            },
          })
          .catch((cloudErr) => {
            console.warn("[useProductStudio] Clear cloud draft failed:", cloudErr);
          });
      }
    });

    toast.info("Draft discarded — restored default configuration");
  }, [
    draftKey,
    storageKey,
    initialFormat,
    initialTheme,
    initialVariation,
    initialShowWhatsApp,
    initialShowVerified,
    initialShowStock,
    initialShowQRCode,
    initialTagline,
  ]);

  const resetPreferences = React.useCallback(() => {
    const defaults: ProductCardCustomization = {
      format: initialFormat,
      theme: initialTheme,
      variation: initialVariation,
      showWhatsAppBadge: initialShowWhatsApp,
      showVerifiedBadge: initialShowVerified,
      showStockBadge: initialShowStock,
      showQRCode: initialShowQRCode,
      customTagline: initialTagline,
    };
    setPreferences(defaults);
    setActiveTemplate(null);
    setHasDraft(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(draftKey);
        toast.success("All preferences & drafts reset to defaults");
      } catch (err) {
        console.warn("[useProductStudio] reset storage error:", err);
      }
    }
  }, [
    initialFormat,
    initialTheme,
    initialVariation,
    initialShowWhatsApp,
    initialShowVerified,
    initialShowStock,
    initialShowQRCode,
    initialTagline,
    storageKey,
    draftKey,
  ]);

  return {
    customization: preferences,
    format: preferences.format,
    theme: preferences.theme,
    variation: preferences.variation,
    framingMode: preferences.framingMode || "hero-75",
    showWhatsAppBadge: preferences.showWhatsAppBadge,
    showVerifiedBadge: preferences.showVerifiedBadge,
    showStockBadge: preferences.showStockBadge,
    showQRCode: preferences.showQRCode,
    customTagline: preferences.customTagline,
    hasDraft,
    isCloudSyncing,
    activeTemplate,
    applyTemplate,
    discardDraft,
    setFormat,
    setTheme,
    setVariation,
    setFramingMode,
    regenerateVariation,
    toggleWhatsAppBadge,
    toggleVerifiedBadge,
    toggleStockBadge,
    toggleQRCode,
    setCustomTagline,
    savePreferences,
    resetPreferences,
    setPreferences,
  };
}
