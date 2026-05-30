import { AlertOctagon, Clock } from "lucide-react";

export function StatusBanner({ status }: { status: string }) {
  if (status === "active") return null;
  if (status === "expired") {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-50 p-4 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <Clock className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Your subscription has expired</p>
          <p className="text-sm">Your store is hidden from buyers. Please contact support to renew your subscription.</p>
        </div>
      </div>
    );
  }
  // blocked or suspended
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-destructive">
      <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">Your store is currently inactive</p>
        <p className="text-sm">Please contact support for assistance. Your products are hidden from buyers until your store is reactivated.</p>
      </div>
    </div>
  );
}
