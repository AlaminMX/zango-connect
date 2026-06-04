/**
 * ImageUploader — reusable image upload with crop + compression.
 * Uploads to Supabase storage bucket and returns a public URL.
 */
import { useCallback, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Loader2, Upload, X, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Props {
  value?: string | null;
  onChange: (url: string | null) => void;
  bucket?: string;
  pathPrefix?: string;
  aspect?: number; // width / height. 1 = square, 16/9 = banner, etc. undefined = freeform/skip-crop
  maxSizeMb?: number;
  label?: string;
  shape?: "circle" | "rect";
  className?: string;
}

async function getCroppedBlob(src: string, area: { x: number; y: number; width: number; height: number }): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9));
}

export function ImageUploader({
  value,
  onChange,
  bucket = "sutura",
  pathPrefix = "uploads",
  aspect = 1,
  maxSizeMb = 5,
  label,
  shape = "rect",
  className = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [srcDataUrl, setSrcDataUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = (file: File) => {
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, or GIF images are allowed");
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`Image too large (max ${maxSizeMb}MB)`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSrcDataUrl(reader.result as string);
      setCropOpen(true);
      setZoom(1); setCrop({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: unknown, areaPixels: { x: number; y: number; width: number; height: number }) => {
    setPixels(areaPixels);
  }, []);

  const upload = async () => {
    if (!srcDataUrl || !pixels) return;
    setBusy(true);
    try {
      const cropped = await getCroppedBlob(srcDataUrl, pixels);
      const file = new File([cropped], "image.jpg", { type: "image/jpeg" });
      const compressed = await imageCompression(file, {
        maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/jpeg",
      });
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? "anon";
      const path = `${uid}/${pathPrefix}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from(bucket).upload(path, compressed, {
        upsert: true, contentType: "image/jpeg",
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Uploaded");
      setCropOpen(false); setSrcDataUrl(null);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const roundedCls = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div className={className}>
      {label && <p className="mb-1.5 text-sm font-medium">{label}</p>}
      <div className={`relative overflow-hidden border bg-muted ${roundedCls} ${shape === "circle" ? "h-24 w-24" : "aspect-[var(--ar)] w-full"}`}
        style={shape === "rect" ? ({ ["--ar" as any]: String(aspect) } as React.CSSProperties) : undefined}>
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            <Upload className="mr-1 h-4 w-4" /> No image
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      </div>
      <div className="mt-2 flex gap-2">
        <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => inputRef.current?.click()}>
          <Pencil className="mr-1 h-3.5 w-3.5" /> {value ? "Replace" : "Upload"}
        </Button>
        {value && (
          <Button type="button" size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => onChange(null)}>
            <X className="mr-1 h-3.5 w-3.5" /> Remove
          </Button>
        )}
      </div>

      <Dialog open={cropOpen} onOpenChange={(o) => !o && !busy && setCropOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Adjust image</DialogTitle></DialogHeader>
          <div className="relative h-72 w-full overflow-hidden rounded-xl bg-black">
            {srcDataUrl && (
              <Cropper
                image={srcDataUrl}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                cropShape={shape === "circle" ? "round" : "rect"}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground">Zoom</p>
            <Slider min={1} max={3} step={0.05} value={[zoom]} onValueChange={(v) => setZoom(v[0])} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={upload} disabled={busy}>
              {busy ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Uploading…</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
