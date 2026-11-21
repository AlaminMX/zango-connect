import { forwardRef, type CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, MapPin, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export function formatMarketingPrice(price?: number | string | null) {
  const amount = Number(price);
  return Number.isFinite(amount) && amount > 0
    ? `₦${amount.toLocaleString("en-NG")}`
    : "Price on request";
}

export function cardInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

interface MarketingCardProps {
  width: number;
  height: number;
  title: string;
  seller?: string;
  location?: string | null;
  image?: string | null;
  imageAlt?: string;
  accent: string;
  url: string;
  price?: string;
  note?: string;
  stock?: string;
  contact?: string;
  verified?: boolean;
  showQr?: boolean;
  fullBleed?: boolean;
  landscapeReverse?: boolean;
  stackedReverse?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const MarketingCard = forwardRef<HTMLDivElement, MarketingCardProps>(
  (
    {
      width,
      height,
      title,
      seller,
      location,
      image,
      imageAlt,
      accent,
      url,
      price,
      note,
      stock,
      contact,
      verified,
      showQr,
      fullBleed,
      landscapeReverse,
      stackedReverse,
      className,
      style,
    },
    ref,
  ) => {
    const wide = width / height > 1.25;
    const unit = Math.min(width, height) / 100;
    const background = "#f8f2e8";
    const ink = "#231d19";
    const displayUrl = url.replace(/^https?:\/\//, "");

    return (
      <div
        ref={ref}
        className={cn("relative isolate flex flex-col overflow-hidden", className)}
        style={{
          width,
          height,
          minWidth: width,
          minHeight: height,
          background,
          color: ink,
          fontFamily: "Arial, sans-serif",
          padding: unit * 4,
          gap: unit * 2.8,
          ...style,
        }}
      >
        <header
          className="relative z-10 flex shrink-0 items-center justify-between"
          style={{ borderBottom: `1px solid ${ink}44`, paddingBottom: unit * 2.2 }}
        >
          <div
            className="flex items-center font-black leading-none"
            style={{ gap: unit * 1.5, fontSize: unit * 4.3, letterSpacing: "-0.06em" }}
          >
            <img
              src="/zango-logo.png"
              alt=""
              crossOrigin="anonymous"
              style={{ width: unit * 5, height: unit * 5, objectFit: "contain" }}
            />
            ZANGO
          </div>
          <span className="font-bold uppercase tracking-[0.14em]" style={{ fontSize: unit * 1.65 }}>
            Kasuwancin Arewa
          </span>
        </header>

        <div
          className={cn(
            "relative flex min-h-0 flex-1 overflow-hidden",
            wide
              ? landscapeReverse
                ? "flex-row-reverse"
                : "flex-row"
              : stackedReverse && !fullBleed
                ? "flex-col-reverse"
                : "flex-col",
          )}
          style={{ gap: unit * 2.8 }}
        >
          <div
            className={cn(
              "overflow-hidden",
              fullBleed && image ? "absolute inset-0" : "relative min-h-0 min-w-0 flex-1",
            )}
            style={{
              background: image && price && !fullBleed ? "#eee6da" : accent,
              borderRadius: unit * 2,
            }}
          >
            {image ? (
              <img
                src={image}
                alt={imageAlt || title}
                crossOrigin="anonymous"
                className={cn(
                  "absolute inset-0 h-full w-full",
                  price && !fullBleed ? "object-contain" : "object-cover",
                )}
              />
            ) : (
              <div
                className="grid h-full place-items-center text-white"
                style={{ fontSize: unit * 15 }}
              >
                {price ? (
                  <ShoppingBag aria-hidden size={unit * 13} strokeWidth={1.25} />
                ) : (
                  cardInitials(title)
                )}
              </div>
            )}
            {stock && (
              <span
                className="absolute font-bold"
                style={{
                  left: unit * 2,
                  top: unit * 2,
                  background,
                  color: ink,
                  padding: `${unit}px ${unit * 1.5}px`,
                  borderRadius: unit,
                  fontSize: unit * 2,
                }}
              >
                {stock}
              </span>
            )}
          </div>

          <div
            className={cn(
              "relative z-10 flex min-w-0 shrink-0 flex-col justify-center",
              fullBleed && image && "self-end",
            )}
            style={{
              width: wide ? "42%" : "100%",
              marginTop: !wide && fullBleed && image ? "auto" : undefined,
              padding: fullBleed && image ? unit * 2.8 : undefined,
              borderRadius: unit * 2,
              background,
              gap: unit * 1.35,
            }}
          >
            {seller && (
              <div
                className="flex min-w-0 items-center font-bold"
                style={{ gap: unit, fontSize: unit * 2.45 }}
              >
                <span className="truncate">{seller}</span>
                {verified && (
                  <BadgeCheck
                    aria-label="Verified seller"
                    className="shrink-0"
                    size={unit * 2.6}
                    color="#29634e"
                  />
                )}
              </div>
            )}
            <div className="flex min-w-0 items-start" style={{ gap: unit }}>
              <p
                className="line-clamp-3 break-words"
                style={{
                  font: `bold ${unit * (title.length > 44 ? 5.4 : 7.4)}px/0.98 Georgia, serif`,
                  letterSpacing: "-0.05em",
                }}
              >
                {title}
              </p>
              {!seller && verified && (
                <BadgeCheck
                  aria-label="Verified seller"
                  className="shrink-0"
                  size={unit * 3.3}
                  color="#29634e"
                />
              )}
            </div>
            {price && (
              <p
                className="font-black leading-tight"
                style={{ fontSize: unit * 4.5, color: accent }}
              >
                {price}
              </p>
            )}
            {location && (
              <p
                className="flex min-w-0 items-center"
                style={{ gap: unit * 0.7, fontSize: unit * 2.4 }}
              >
                <MapPin aria-hidden className="shrink-0" size={unit * 2.4} />
                <span className="truncate">{location}</span>
              </p>
            )}
            {note && (
              <p
                className="line-clamp-2 break-words"
                style={{ fontSize: unit * 2.2, lineHeight: 1.25 }}
              >
                {note}
              </p>
            )}
          </div>
        </div>

        <footer
          className="flex shrink-0 items-center justify-between text-white"
          style={{
            background: ink,
            borderRadius: unit * 1.8,
            padding: unit * 2.2,
            gap: unit * 1.4,
          }}
        >
          <div className="min-w-0">
            <p className="font-bold leading-tight" style={{ fontSize: unit * 2.8 }}>
              {price ? "View product" : "Visit store"}
            </p>
            <p className="break-all leading-tight" style={{ fontSize: unit * 1.8, opacity: 0.85 }}>
              {displayUrl}
            </p>
            {contact && <p style={{ fontSize: unit * 1.8 }}>WhatsApp · {contact}</p>}
          </div>
          {showQr && (
            <QRCodeSVG
              className="shrink-0"
              title={price ? "Scan to view product" : "Scan to visit store"}
              value={url}
              size={unit * 10.5}
              marginSize={4}
            />
          )}
        </footer>
      </div>
    );
  },
);
MarketingCard.displayName = "MarketingCard";
