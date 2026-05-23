import { Link } from "@tanstack/react-router";
import { Search, User } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const { lang, setLang } = useLang();
  return (
    <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-serif text-2xl font-semibold tracking-tight text-primary">Sutura</span>
          <span className="font-serif text-2xl text-foreground/80">Market</span>
        </Link>
        <div className="flex items-center gap-1">
          <button aria-label="Search" className="rounded-full p-2 hover:bg-muted">
            <Search className="h-5 w-5 text-foreground/70" />
          </button>
          <div className="flex items-center rounded-full bg-muted p-0.5 text-xs font-medium">
            <button
              onClick={() => setLang("en")}
              className={`rounded-full px-2.5 py-1 transition ${lang === "en" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >EN</button>
            <button
              onClick={() => setLang("ha")}
              className={`rounded-full px-2.5 py-1 transition ${lang === "ha" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >HA</button>
          </div>
          <Link to="/auth">
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
      <div className="border-shift h-px w-full opacity-40" />
    </header>
  );
}
