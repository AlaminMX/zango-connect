import { toast } from "sonner";

export interface ShareStoreOptions {
  businessName: string;
  slug: string;
}

export function getVendorStoreUrl(slug: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/store/${slug}`;
  }
  return `https://zango-connect.vercel.app/store/${slug}`;
}

export async function shareVendorStore({
  businessName,
  slug,
}: ShareStoreOptions): Promise<{ success: boolean; method: "web-share" | "clipboard" | "cancelled" }> {
  const storeUrl = getVendorStoreUrl(slug);
  const shareData: ShareData = {
    title: `${businessName} on ZANGO`,
    text: `Visit ${businessName} on ZANGO to explore our products and order directly!`,
    url: storeUrl,
  };

  // 1. Attempt native Web Share API
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      // Some browsers require canShare check
      if (!navigator.canShare || navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success("Store link shared successfully!");
        return { success: true, method: "web-share" };
      }
    } catch (err: unknown) {
      const error = err as { name?: string };
      // User tapped cancel on native share sheet
      if (error?.name === "AbortError") {
        return { success: false, method: "cancelled" };
      }
      // Otherwise continue to clipboard fallback
    }
  }

  // 2. Fallback: Clipboard copy
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(storeUrl);
      toast.success("Store URL copied to clipboard!");
      return { success: true, method: "clipboard" };
    }
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = storeUrl;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    toast.success("Store URL copied to clipboard!");
    return { success: true, method: "clipboard" };
  } catch {
    toast.error("Could not copy store URL. Please copy it manually.");
    return { success: false, method: "cancelled" };
  }
}

export function openSocialShare(platform: "whatsapp" | "twitter" | "facebook", { businessName, slug }: ShareStoreOptions) {
  const storeUrl = getVendorStoreUrl(slug);
  const text = `Explore ${businessName}'s store on ZANGO: ${storeUrl}`;

  let shareUrl = "";
  if (platform === "whatsapp") {
    shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  } else if (platform === "twitter") {
    shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${businessName}'s verified store on ZANGO!`)}&url=${encodeURIComponent(storeUrl)}`;
  } else if (platform === "facebook") {
    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`;
  }

  if (shareUrl && typeof window !== "undefined") {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }
}
