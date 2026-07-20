/** Formatting helpers for the Vendor Share Card. Kept dependency-free (no date-fns) on purpose. */

/** "2024-03-01" | Date  ->  "March 2024" */
export function formatJoinDate(joinDate: string | Date): string {
  const date = typeof joinDate === "string" ? new Date(joinDate) : joinDate;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

/** 1 -> "1 Product", 12 -> "12 Products" */
export function formatProductCount(count: number): string {
  const n = Number.isFinite(count) ? Math.max(0, count) : 0;
  return `${n.toLocaleString()} ${n === 1 ? "Product" : "Products"}`;
}

/** First letter of the business name, used as a fallback avatar glyph. */
export function getInitial(businessName: string): string {
  return businessName.trim().charAt(0).toUpperCase() || "Z";
}

/** Strips the protocol for a compact on-card URL label, e.g. "zango.com.ng/store/adaora-fabrics". */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
