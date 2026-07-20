/**
 * VendorShareCardDialog — profile-page entry point for the premium,
 * 1600×900 Vendor Share Card (see `components/vendor-card/`).
 *
 * Maps a `sellers` row (+ live product count) to `VendorCardProps` and
 * renders the responsive preview with its "Generate Share Card" button.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VendorCardExport } from "@/components/vendor-card";

export interface VendorShareCardSeller {
  business_name: string;
  slug: string;
  bio: string | null;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  category: string;
  city: string;
  is_verified: boolean;
  created_at: string;
}

interface VendorShareCardDialogProps {
  seller: VendorShareCardSeller;
  productCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendorShareCardDialog({ seller, productCount, open, onOpenChange }: VendorShareCardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Your shareable vendor card</DialogTitle>
        </DialogHeader>

        <p className="-mt-2 text-xs text-muted-foreground">
          A premium card generated from your live profile — download it to post on WhatsApp, Instagram,
          Facebook or X.
        </p>

        <VendorCardExport
          vendor={{
            businessName: seller.business_name,
            description: seller.bio,
            logo: seller.profile_photo_url,
            coverImage: seller.cover_photo_url,
            category: seller.category,
            location: seller.city,
            verified: seller.is_verified,
            productCount,
            joinDate: seller.created_at,
            slug: seller.slug,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
