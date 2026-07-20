import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Store, X } from "lucide-react";

const STORAGE_KEY = "sutura-visitor-role";

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setOpen(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  if (!open) return null;

  const choose = (role: "buyer" | "seller") => {
    localStorage.setItem(STORAGE_KEY, role);
    setOpen(false);
    if (role === "seller") nav({ to: "/register" });
  };

  const dismiss = () => { localStorage.setItem(STORAGE_KEY, "buyer"); setOpen(false); };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={dismiss}>
      <div className="w-full max-w-sm rounded-3xl bg-card border border-border/60 shadow-2xl p-7" onClick={e => e.stopPropagation()}
        style={{ animation: "welcome-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <style>{`@keyframes welcome-in { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:none } }`}</style>
        <div className="flex justify-end -mt-2 -mr-2 mb-2">
          <button onClick={dismiss} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"><X className="h-4 w-4" /></button>
        </div>
        <div className="text-center mb-5">
          <img src="/zango-logo.png" alt="" className="mx-auto h-16 w-16 object-contain mb-3" />
          <h2 className="font-serif text-2xl leading-tight">Welcome to ZANGO</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Kasuwancin Arewa — Northern Nigeria's community marketplace.<br/>What brings you here today?</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([["buyer","I'm Shopping","Browse & discover",ShoppingBag],["seller","I'm Selling","Open your store",Store]] as const).map(([role, label, sub, Icon]) => (
            <button key={role} onClick={() => choose(role)}
              className="flex flex-col items-center gap-2.5 rounded-2xl border-2 border-border bg-background p-5 text-center transition hover:border-primary/40 hover:bg-secondary/40 active:scale-[0.97] focus:outline-none">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary"><Icon className="h-6 w-6 text-primary" /></div>
              <div><p className="font-semibold text-sm">{label}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p></div>
            </button>
          ))}
        </div>
        <button onClick={dismiss} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground transition">Just browsing — skip for now</button>
      </div>
    </div>
  );
}
