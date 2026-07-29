/**
 * SocialLinksAnnouncement — one-time dismissible nudge shown to a store owner
 * who hasn't added an Instagram or Snapchat handle yet, telling them the
 * fields now exist. Dismissal is remembered per-browser via localStorage so
 * it doesn't nag on every visit; it also permanently stops showing itself
 * once the seller actually fills either field in.
 */
import { useEffect, useState } from "react";
import { Instagram, X } from "lucide-react";

const DISMISS_KEY_PREFIX = "zango-dismissed-social-announcement:";

export function SocialLinksAnnouncement({
  sellerId,
  hasSocialLinks,
  onAddNow,
}: {
  sellerId: string;
  hasSocialLinks: boolean;
  onAddNow: () => void;
}) {
  const dismissKey = `${DISMISS_KEY_PREFIX}${sellerId}`;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [dismissKey]);

  if (hasSocialLinks || dismissed) return null;

  const dismiss = () => {
    try { localStorage.setItem(dismissKey, "1"); } catch { /* private browsing, etc — fine to skip */ }
    setDismissed(true);
  };

  return (
    <div className="relative rounded-2xl border border-primary/20 bg-primary/5 p-4" role="status">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-primary/10"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <Instagram className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-espresso">New: add your Instagram &amp; Snapchat</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Shoppers can now find and follow you off ZANGO too. Add your handles and they'll show as icons on your store page.
          </p>
          <button
            type="button"
            onClick={() => { dismiss(); onAddNow(); }}
            className="mt-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Add now
          </button>
        </div>
      </div>
    </div>
  );
}
