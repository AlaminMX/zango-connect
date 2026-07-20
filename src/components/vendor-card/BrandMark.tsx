interface BrandMarkProps {
  className?: string;
}

/** Top-left corner brand lockup: Zango mark + "Discover · Support · Empower". */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <img
        src="/zango-logo.png"
        alt=""
        aria-hidden="true"
        className="h-10 w-10 shrink-0 object-contain drop-shadow-sm"
      />
      <div className="flex flex-col leading-none">
        <span className="font-display text-[22px] font-bold tracking-wide text-[#5B3A29]">
          Zango
        </span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8C6239]">
          Discover &bull; Support &bull; Empower
        </span>
      </div>
    </div>
  );
}
