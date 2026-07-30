/**
 * MultiImageUploader — upload up to N images to Supabase storage, return ordered URLs.
 * No crop UX (keeps simple); compresses to <=1MB / <=1600px.
 */
import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { humanizeError } from "@/lib/error-messages";

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  bucket?: string;
  pathPrefix?: string;
}

export function MultiImageUploader({
  value,
  onChange,
  max = 5,
  bucket = "sutura",
  pathPrefix = "product",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const slotsLeft = max - value.length;
    const list = Array.from(files).slice(0, slotsLeft);
    if (list.length === 0) { toast.error(`Max ${max} images`); return; }
    setBusy(true);
    try {
      const { data: u, error: userErr } = await supabase.auth.getUser();
      if (userErr || !u.user) {
        toast.error("Your session hasn't finished loading. Please wait a second and try again.");
        return;
      }
      const uid = u.user.id;
      const uploaded: string[] = [];
      for (const file of list) {
        if (!file.type.startsWith("image/")) { toast.error("Only images allowed"); continue; }
        if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name} too large (max 8MB)`); continue; }
        const compressed = await imageCompression(file, {
          maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/jpeg",
        });
        const path = `${uid}/${pathPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { error } = await supabase.storage.from(bucket).upload(path, compressed, {
          upsert: true, contentType: "image/jpeg",
        });
        if (error) { toast.error(humanizeError(error.message)); continue; }
        uploaded.push(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
      }
      if (uploaded.length) onChange([...value, ...uploaded]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {value.map((url, i) => (
          <div key={url} className="relative aspect-square overflow-hidden rounded-xl border border-border-warm bg-surface-warm">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-espresso/70 text-white hover:bg-destructive"
              aria-label="Remove image"
            ><X className="h-3.5 w-3.5" /></button>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold text-primary-foreground">Cover</span>
            )}
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square min-h-[44px] items-center justify-center rounded-xl border-2 border-dashed border-border-warm bg-surface-warm/50 text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-6 w-6" />}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Up to {max} photos. First photo is the cover.
      </p>
      <Button
        type="button" variant="ghost" size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={busy || value.length >= max}
        className="mt-1 rounded-full text-xs"
      >
        {busy ? "Uploading…" : "Add photos"}
      </Button>
    </div>
  );
}
