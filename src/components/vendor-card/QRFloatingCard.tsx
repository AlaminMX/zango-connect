import { QRCodeSVG } from "qrcode.react";
import { displayUrl } from "./utils";

interface QRFloatingCardProps {
  storeUrl: string;
}

/** Floating white card with a scannable QR code, pinned to the bottom-right of the cover image. */
export function QRFloatingCard({ storeUrl }: QRFloatingCardProps) {
  return (
    <div className="absolute -bottom-7 -right-6 flex w-[188px] flex-col items-center gap-2.5 rounded-[20px] bg-[#F8F4EF] px-5 py-5 shadow-[0_24px_48px_-12px_rgba(91,58,41,0.5)] ring-1 ring-black/5">
      <div className="rounded-xl bg-white p-2.5 shadow-sm">
        <QRCodeSVG value={storeUrl} size={92} fgColor="#5B3A29" bgColor="#FFFFFF" level="M" />
      </div>
      <p className="text-center text-[12.5px] font-semibold leading-tight text-[#5B3A29]">
        Visit my store on Zango
      </p>
      <p className="text-center text-[10.5px] font-medium leading-tight text-[#8C6239]">
        {displayUrl(storeUrl)}
      </p>
    </div>
  );
}
