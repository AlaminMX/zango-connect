import { Heart } from "lucide-react";

/** Full-width brown gradient footer strip: "Support Small Businesses" · "Powered by Zango". */
export function BottomBar() {
  return (
    <div className="flex h-[92px] w-full shrink-0 items-center justify-center gap-6 bg-[linear-gradient(90deg,#5B3A29_0%,#734727_50%,#8C6239_100%)] px-14">
      <div className="flex items-center gap-2.5">
        <Heart className="h-[16px] w-[16px] fill-[#F8F4EF] text-[#F8F4EF]" />
        <span className="text-[14px] font-semibold tracking-wide text-[#F8F4EF]">
          Support Small Businesses
        </span>
      </div>

      <span className="h-6 w-px bg-white/25" aria-hidden="true" />

      <div className="flex items-center gap-2">
        <img src="/zango-logo.png" alt="" aria-hidden="true" className="h-[18px] w-[18px] object-contain" />
        <span className="text-[13px] font-medium tracking-[0.04em] text-[#F8F4EF]/90">
          Powered by Zango
        </span>
      </div>
    </div>
  );
}
