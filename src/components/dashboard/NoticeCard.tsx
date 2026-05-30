import { Info, AlertTriangle, AlertOctagon, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export interface Notice {
  id: string;
  title: string;
  message: string;
  severity: string;
  created_at: string;
  read_at: string | null;
}

const styles: Record<string, { wrap: string; icon: typeof Info; label: string }> = {
  info: {
    wrap: "border-blue-500/40 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100",
    icon: Info,
    label: "Information",
  },
  warning: {
    wrap: "border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
    icon: AlertTriangle,
    label: "Warning",
  },
  critical: {
    wrap: "border-destructive/50 bg-destructive/10 text-destructive",
    icon: AlertOctagon,
    label: "Critical",
  },
};

export function NoticeCard({ notice, onRead }: { notice: Notice; onRead: (id: string) => void }) {
  const s = styles[notice.severity] ?? styles.info;
  const Icon = s.icon;
  const [marking, setMarking] = useState(false);

  const markRead = async () => {
    setMarking(true);
    const { error } = await supabase
      .from("seller_notices")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notice.id);
    setMarking(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as read");
    onRead(notice.id);
  };

  return (
    <div className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 ${s.wrap}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase opacity-75">{s.label}</p>
        <p className="font-semibold">{notice.title}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm">{notice.message}</p>
        <button
          onClick={markRead}
          disabled={marking}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1.5 text-xs font-medium hover:bg-background"
        >
          <Check className="h-3.5 w-3.5" /> {marking ? "Saving…" : "Mark as read"}
        </button>
      </div>
    </div>
  );
}
