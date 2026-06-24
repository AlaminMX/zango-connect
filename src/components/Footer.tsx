import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 bg-espresso text-background" style="margin-top: 0px;">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <p className="font-display text-3xl text-background">Sutura Market</p>
            <p className="mt-2 max-w-md text-sm text-background/70">
              The WhatsApp-first marketplace built for northern Nigeria's women entrepreneurs. Discover, vouch, trade.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-background/80 md:justify-end">
            <Link to="/" className="hover:text-background">Home</Link>
            <Link to="/sellers" className="hover:text-background">Sellers</Link>
            <Link to="/products" className="hover:text-background">Products</Link>
            <Link to="/register" className="hover:text-background">Open a store</Link>
            <a href="https://wa.me/2347083958881" target="_blank" rel="noopener noreferrer" className="hover:text-background">
              WhatsApp support
            </a>
          </nav>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-background/15 pt-6 text-xs text-background/55 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Sutura Market — Arewa kasuwa.</span>
          <span>Made with care in Northern Nigeria.</span>
        </div>
      </div>
    </footer>
  );
}
