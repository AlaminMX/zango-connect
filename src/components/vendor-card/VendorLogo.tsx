import { getInitial } from "./utils";

interface VendorLogoProps {
  logo?: string | null;
  businessName: string;
}

/** 120px circular vendor logo. Falls back to a warm gradient monogram. */
export function VendorLogo({ logo, businessName }: VendorLogoProps) {
  return (
    <div className="h-[120px] w-[120px] shrink-0 overflow-hidden rounded-full bg-[linear-gradient(135deg,#D9C2A3_0%,#8C6239_100%)] shadow-[0_18px_36px_-10px_rgba(91,58,41,0.45)] ring-[6px] ring-white">
      {logo ? (
        <img
          src={logo}
          alt={businessName}
          crossOrigin="anonymous"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="font-display text-[46px] font-bold text-[#F8F4EF]">
            {getInitial(businessName)}
          </span>
        </div>
      )}
    </div>
  );
}
