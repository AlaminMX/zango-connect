/**
 * VerificationBanner — shown in seller dashboard/store when a seller is not yet approved.
 */
import { AlertCircle, CheckCircle2, XCircle, Clock } from "lucide-react";

export type VerificationStatus = "pending" | "approved" | "rejected" | "suspended";

export function VerificationBanner({ status, reason }: { status: VerificationStatus; reason?: string | null }) {
  if (status === "approved") return null;

  const config = {
    pending: {
      icon: Clock,
      bg: "bg-amber-50 border-amber-200 text-amber-900",
      iconColor: "text-amber-600",
      title: "🟡 Verification Pending",
      body: "Your store is currently under review. Product creation will become available after approval.",
    },
    rejected: {
      icon: XCircle,
      bg: "bg-rose-50 border-rose-200 text-rose-900",
      iconColor: "text-rose-600",
      title: "🔴 Verification Rejected",
      body: reason || "Your store was not approved. Please review your information and resubmit.",
    },
    suspended: {
      icon: AlertCircle,
      bg: "bg-rose-50 border-rose-200 text-rose-900",
      iconColor: "text-rose-600",
      title: "⛔ Store Suspended",
      body: reason || "Your store has been suspended by administration. Contact support for details.",
    },
  } as const;

  const c = config[status];
  const Icon = c.icon;
  return (
    <div className={`rounded-2xl border-2 p-4 ${c.bg}`} role="alert">
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 shrink-0 ${c.iconColor}`} />
        <div className="flex-1">
          <p className="font-semibold">{c.title}</p>
          <p className="mt-1 text-sm">{c.body}</p>
        </div>
      </div>
    </div>
  );
}

export function ApprovedBanner() {
  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-emerald-900" role="status">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <p className="font-semibold">🟢 Your store has been approved and is now live.</p>
      </div>
    </div>
  );
}
