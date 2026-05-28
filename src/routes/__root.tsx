import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { LangProvider } from "@/lib/i18n";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-7xl text-primary">404</h1>
        <p className="mt-2 text-muted-foreground">This page doesn't exist.</p>
        <a href="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Go home</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sutura Market — Your Business, Discovered." },
      { name: "description", content: "The marketplace built for northern Nigeria's women entrepreneurs. Discover sellers, order on WhatsApp." },
      { property: "og:title", content: "Sutura Market — Your Business, Discovered." },
      { property: "og:description", content: "The marketplace built for northern Nigeria's women entrepreneurs. Discover sellers, order on WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Sutura Market — Your Business, Discovered." },
      { name: "twitter:description", content: "The marketplace built for northern Nigeria's women entrepreneurs. Discover sellers, order on WhatsApp." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/sgPidVUphLSGVGq51GiPoIX6I323/social-images/social-1779979957518-de2fabe1-9118-4df0-b36b-cade9a776284.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/sgPidVUphLSGVGq51GiPoIX6I323/social-images/social-1779979957518-de2fabe1-9118-4df0-b36b-cade9a776284.webp" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <Outlet />
        <Toaster />
      </LangProvider>
    </QueryClientProvider>
  );
}
