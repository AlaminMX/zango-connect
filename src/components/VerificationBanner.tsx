/**
 * VerificationBanner — shown in seller dashboard/store when seller is not yet approved.
 * ApprovedBanner — a clean, minimal status badge for approved sellers (replaces the old
 * full-width "Your store is approved and now live" green alert box).
 */
import { AlertCircle, XCircle, Clock, CheckCircle2, Package, TrendingUp } from "lucide-react";

export type VerificationStatus = "pending" | "approved" | "rejected" | "suspended";

export function VerificationBanner({
  status,
  reason,
}: {
  status: VerificationStatus;
  reason?: string | null;
}) {
  if (status === "approved") return null;

  const config = {
    pending: {
      icon: Clock,
      bg: "bg-amber-50 border-amber-200 text-amber-900",
      iconColor: "text-amber-600",
      title: "Verification Pending",
      body: "Your store is currently under review. Product management becomes available once approved.",
    },
    rejected: {
      icon: XCircle,
      bg: "bg-rose-50 border-rose-200 text-rose-900",
      iconColor: "text-rose-600",
      title: "Verification Rejected",
      body:
        reason ||
        "Your store was not approved. Please review your information and contact support.",
    },
    suspended: {
      icon: AlertCircle,
      bg: "bg-rose-50 border-rose-200 text-rose-900",
      iconColor: "text-rose-600",
      title: "Store Suspended",
      body:
        reason || "Your store has been suspended by administration. Contact support for details.",
    },
  } as const;

  const c = config[status];
  const Icon = c.icon;
  return (
    <div className={`rounded-2xl border p-4 ${c.bg}`} role="alert">
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${c.iconColor}`} />
        <div className="flex-1">
          <p className="text-sm font-semibold">{c.title}</p>
          <p className="mt-0.5 text-sm opacity-80">{c.body}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * ApprovedBanner — replaces the old green full-width alert.
 * Renders a compact row of live stats chips instead of a banner.
 */
export function ApprovedBanner({
  productCount = 0,
  clicks7d = 0,
}: {
  productCount?: number;
  clicks7d?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Live indicator pill */}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Store live
      </span>

      {/* Products count chip */}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-warm border border-border-warm px-3 py-1.5 text-xs font-medium text-espresso">
        <Package className="h-3 w-3 text-primary" />
        {productCount} product{productCount !== 1 ? "s" : ""}
      </span>

      {/* WhatsApp clicks chip */}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-warm border border-border-warm px-3 py-1.5 text-xs font-medium text-espresso">
        <TrendingUp className="h-3 w-3 text-primary" />
        {clicks7d} click{clicks7d !== 1 ? "s" : ""} this week
      </span>
    </div>
  );
}
