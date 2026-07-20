import type { LucideIcon } from "lucide-react";
import { BadgeCheck, CalendarDays, MapPin, Package, ShoppingBag } from "lucide-react";
import { formatJoinDate, formatProductCount } from "./utils";

interface VendorInfoListProps {
  location: string;
  category: string;
  verified?: boolean;
  productCount: number;
  joinDate: string | Date;
}

interface Row {
  icon: LucideIcon;
  label: string;
  emphasis?: boolean;
}

/** Elegant, icon-led list of vendor facts: location, category, verified, products, joined. */
export function VendorInfoList({ location, category, verified, productCount, joinDate }: VendorInfoListProps) {
  const rows: Row[] = [
    { icon: MapPin, label: location },
    { icon: ShoppingBag, label: category },
    ...(verified ? [{ icon: BadgeCheck, label: "Verified Vendor", emphasis: true }] : []),
    { icon: Package, label: formatProductCount(productCount) },
    { icon: CalendarDays, label: `Joined ${formatJoinDate(joinDate)}` },
  ];

  return (
    <div className="flex flex-col gap-[14px]">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-3.5">
          <span
            className={
              row.emphasis
                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#D9C2A3_0%,#8C6239_100%)] shadow-sm"
                : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFE3D3] shadow-sm"
            }
          >
            <row.icon
              className={row.emphasis ? "h-[17px] w-[17px] text-[#F8F4EF]" : "h-[17px] w-[17px] text-[#8C6239]"}
              strokeWidth={2.2}
            />
          </span>
          <span className="text-[16px] font-medium text-[#5B3A29]">{row.label}</span>
        </div>
      ))}
    </div>
  );
}
