import { useEffect, useId, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { useSearchSuggestions } from "@/hooks/use-marketplace-search";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  dark?: boolean;
  autoFocus?: boolean;
  isSearching?: boolean;
};

export function MarketplaceSearchBox({ value, onChange, onSubmit, placeholder = "Search products, sellers, categories…", className, inputClassName, dark, autoFocus, isSearching }: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { data: suggestions = [], isFetching } = useSearchSuggestions(value);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => setActiveIndex(-1), [value]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    onSubmit?.(nextValue);
  };

  return (
    <div ref={rootRef} className={cn("relative flex-1", className)}>
      <Search className={cn("pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2", dark ? "text-white/40" : "text-muted-foreground")} />
      <input
        id={id}
        type="search"
        autoFocus={autoFocus}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); return; }
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1)); return; }
          if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, -1)); return; }
          if (e.key === "Enter") {
            e.preventDefault();
            const selected = activeIndex >= 0 ? suggestions[activeIndex]?.value : value;
            if (selected.trim()) choose(selected.trim());
          }
        }}
        placeholder={placeholder}
        className={cn("w-full bg-transparent pl-10 pr-10 text-sm outline-none placeholder:text-muted-foreground", inputClassName)}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={`${id}-suggestions`}
        aria-activedescendant={activeIndex >= 0 ? `${id}-suggestion-${activeIndex}` : undefined}
      />
      {(isSearching || isFetching) && <Loader2 className={cn("absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin", dark ? "text-white/50" : "text-muted-foreground")} />}
      {open && suggestions.length > 0 && (
        <div id={`${id}-suggestions`} role="listbox" className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-72 overflow-y-auto rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-xl">
          {suggestions.map((suggestion, index) => (
            <button
              id={`${id}-suggestion-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              key={suggestion.id}
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(suggestion.value)}
              className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition", activeIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent/70")}
            >
              <span className="line-clamp-1 font-medium">{suggestion.label}</span>
              <span className="ml-3 shrink-0 text-[11px] capitalize text-muted-foreground">{suggestion.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
