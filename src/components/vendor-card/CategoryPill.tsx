import { Tag } from "lucide-react";

interface CategoryPillProps {
  category: string;
}

/** Small rounded "Fashion"-style pill shown under the logo. */
export function CategoryPill({ category }: CategoryPillProps) {
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[linear-gradient(135deg,#D9C2A3_0%,#C4A578_100%)] px-4 py-[7px] shadow-sm">
      <Tag className="h-[13px] w-[13px] text-[#5B3A29]" strokeWidth={2.4} />
      <span className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-[#5B3A29]">
        {category}
      </span>
    </span>
  );
}
