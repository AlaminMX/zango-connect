// Hausa translations for category names (light accents only)
export const CATEGORY_HAUSA: Record<string, string> = {
  "Food & Drinks": "Abinci",
  "Fashion": "Kayan Moda",
  "Beauty": "Kyau",
  "Home": "Gida",
  "Home & Living": "Gida",
  "Crafts": "Sana'a",
  "Services": "Hidima",
  "Other": "Sauran",
};

export const NIGERIAN_CITIES = ["Kano", "Kaduna", "Abuja", "Sokoto", "Katsina", "Zaria", "Bauchi", "Maiduguri", "Other"];

export function hausaFor(name?: string | null): string | null {
  if (!name) return null;
  return CATEGORY_HAUSA[name] ?? null;
}
