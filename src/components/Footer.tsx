import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/50 bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-serif text-xl text-primary">Sutura Market</p>
            <p className="mt-1 text-xs text-muted-foreground">Built for northern Nigeria's women entrepreneurs.</p>
          </div>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">About</Link>
            <Link to="/register" className="hover:text-primary">Join as Seller</Link>
            <a href="https://wa.me/2348000000000" className="hover:text-primary">WhatsApp Support</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
