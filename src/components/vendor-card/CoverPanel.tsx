interface CoverPanelProps {
  coverImage?: string | null;
  businessName: string;
}

/** Large rounded hero panel on the right ~45% of the card. Gradient fallback when no cover photo exists. */
export function CoverPanel({ coverImage, businessName }: CoverPanelProps) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[32px] shadow-[0_30px_60px_-20px_rgba(91,58,41,0.5)]">
      {coverImage ? (
        <img
          src={coverImage}
          alt={businessName}
          crossOrigin="anonymous"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="relative flex h-full w-full items-center justify-center bg-[linear-gradient(155deg,#D9C2A3_0%,#8C6239_55%,#5B3A29_100%)]">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-black/10" />
          <img
            src="/zango-logo.png"
            alt=""
            aria-hidden="true"
            className="relative h-24 w-24 object-contain opacity-70 drop-shadow-lg"
          />
        </div>
      )}
      {/* Subtle bottom gradient so the floating QR card always sits on a legible surface */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(91,58,41,0)_0%,rgba(58,36,25,0.35)_100%)]" />
    </div>
  );
}
