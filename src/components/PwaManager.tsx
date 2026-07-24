import * as React from "react";
import { Download, RefreshCw, WifiOff, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "zango:pwa-install-dismissed-at";
const INSTALL_HIDE_DAYS = 14;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function recentlyDismissed() {
  const dismissedAt = window.localStorage.getItem(DISMISS_KEY);
  if (!dismissedAt) return false;
  return Date.now() - Number(dismissedAt) < INSTALL_HIDE_DAYS * 24 * 60 * 60 * 1000;
}

export function PwaManager() {
  const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = React.useState(false);
  const [offline, setOffline] = React.useState(false);
  const [waitingWorker, setWaitingWorker] = React.useState<ServiceWorker | null>(null);

  React.useEffect(() => {
    setOffline(!navigator.onLine);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (isStandalone() || recentlyDismissed()) return;
      setInstallPrompt(event as BeforeInstallPromptEvent);
      window.setTimeout(() => setShowInstall(true), 3000);
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
      setShowInstall(false);
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };
    const onOnline = () => {
      setOffline(false);
      toast.success("You're back online", { description: "ZANGO will refresh marketplace content automatically." });
    };
    const onOffline = () => setOffline(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
        const notifyUpdate = (worker?: ServiceWorker | null) => worker && setWaitingWorker(worker);
        notifyUpdate(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) notifyUpdate(worker);
          });
        });
      }).catch((error) => console.warn("ZANGO service worker registration failed", error));

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const dismissInstall = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowInstall(false);
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "dismissed") window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setInstallPrompt(null);
    setShowInstall(false);
  };

  const applyUpdate = () => waitingWorker?.postMessage({ type: "SKIP_WAITING" });

  return (
    <>
      {offline ? (
        <div className="fixed inset-x-3 top-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border-warm bg-card px-4 py-3 text-sm text-foreground shadow-lg">
          <WifiOff className="size-4 text-primary" aria-hidden="true" />
          <span>ZANGO is offline. Cached pages remain available.</span>
        </div>
      ) : null}

      {waitingWorker ? (
        <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-3xl border border-border-warm bg-card p-4 shadow-2xl md:bottom-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-2 text-primary"><RefreshCw className="size-5" /></div>
            <div className="flex-1">
              <p className="font-semibold">A fresh ZANGO update is ready</p>
              <p className="mt-1 text-sm text-muted-foreground">Refresh when convenient to load the newest marketplace experience.</p>
              <Button className="mt-3 rounded-full" size="sm" onClick={applyUpdate}>Refresh now</Button>
            </div>
          </div>
        </div>
      ) : null}

      {showInstall && installPrompt ? (
        <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-3xl border border-border-warm bg-card p-4 shadow-2xl md:bottom-5">
          <button className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted" onClick={dismissInstall} aria-label="Dismiss install prompt"><X className="size-4" /></button>
          <div className="flex items-start gap-3 pr-6">
            <div className="rounded-2xl bg-primary p-2 text-primary-foreground"><Download className="size-5" /></div>
            <div className="flex-1">
              <p className="font-semibold">Install ZANGO</p>
              <p className="mt-1 text-sm text-muted-foreground">Launch faster, browse cached pages offline, and keep ZANGO on your home screen.</p>
              <div className="mt-3 flex gap-2">
                <Button className="rounded-full" size="sm" onClick={install}>Install app</Button>
                <Button className="rounded-full" size="sm" variant="ghost" onClick={dismissInstall}>Not now</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
