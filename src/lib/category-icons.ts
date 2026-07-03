/**
 * Map categories to appropriate icons from lucide-react
 * Used for visual enhancement of category pills on homepage
 */
import {
  Shirt, Droplet, Home, Utensils, Zap, Hammer, 
  Heart, Book, Gamepad2, Music, Camera, Briefcase,
  Package, Palette, Flower, LucideIcon
} from "lucide-react";

const categoryIconMap: Record<string, LucideIcon> = {
  // Fashion & Clothing
  "Fashion & Clothing": Shirt,
  "Clothing": Shirt,
  "Apparel": Shirt,

  // Beauty & Skincare
  "Beauty & Skincare": Droplet,
  "Beauty": Droplet,
  "Skincare": Droplet,
  "Cosmetics": Droplet,

  // Home & Living
  "Home & Living": Home,
  "Furniture": Home,
  "Home Decor": Home,
  "Kitchenware": Home,

  // Food & Beverages
  "Food & Homemade Goods": Utensils,
  "Food": Utensils,
  "Beverages": Utensils,
  "Beverages & Drinks": Utensils,

  // Electronics
  "Electronics": Zap,
  "Gadgets": Zap,
  "Phones": Zap,
  "Laptops": Zap,

  // Tools & Hardware
  "Tools & Hardware": Hammer,
  "Tools": Hammer,
  "Hardware": Hammer,

  // Health & Wellness
  "Health & Wellness": Heart,
  "Health": Heart,
  "Wellness": Heart,
  "Fitness": Heart,

  // Books & Media
  "Books & Media": Book,
  "Books": Book,
  "Educational": Book,

  // Entertainment
  "Entertainment": Gamepad2,
  "Gaming": Gamepad2,
  "Toys": Gamepad2,

  // Music & Audio
  "Music": Music,
  "Audio": Music,

  // Photography
  "Photography": Camera,
  "Photos": Camera,

  // Services
  "Services": Briefcase,
  "Consulting": Briefcase,

  // General/Default
  "Other": Package,
  "General": Package,
  "Products": Package,
};

export function getCategoryIcon(categoryName: string): LucideIcon {
  return categoryIconMap[categoryName] || Package;
}
