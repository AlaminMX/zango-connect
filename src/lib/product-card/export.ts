import { productCardFormats, getProductStoreUrl } from "./themes";
import type { ProductCardExportOptions, ProductCardFormat } from "./types";

/**
 * Pre-warm and decode all images in the node
 */
async function ensureImagesReady(node: HTMLElement): Promise<void> {
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font readiness errors if unsupported
    }
  }

  if (typeof window !== "undefined" && node) {
    const images = Array.from(node.querySelectorAll("img"));
    await Promise.all(
      images.map(async (img) => {
        if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        }
        if ("decode" in img) {
          try {
            await img.decode();
          } catch {
            // Ignore decoding failure on SVG / cross-origin
          }
        }
      }),
    );
  }
}

/**
 * Export rendered ProductCardCanvas across multiple aspect ratios (WhatsApp Status, Story, Square)
 */
export async function exportProductCardCanvas(
  canvasNode: HTMLElement,
  format: ProductCardFormat = "whatsapp-status",
  filename = "zango-product-card",
  pixelRatio = 2,
): Promise<string> {
  return exportProductCard({
    node: canvasNode,
    filename,
    format,
    pixelRatio,
  });
}

/**
 * Export product card to high-resolution PNG
 */
export async function exportProductCard({
  node,
  filename = "zango-product-card",
  format = "whatsapp-status",
  pixelRatio = 2,
}: ProductCardExportOptions): Promise<string> {
  const { toPng } = await import("html-to-image");
  const dimensions = productCardFormats[format];

  await ensureImagesReady(node);

  const exportStyle: Partial<CSSStyleDeclaration> = {
    transform: "none",
    transformOrigin: "top left",
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    maxWidth: "none",
    maxHeight: "none",
    margin: "0",
  };

  let dataUrl: string;
  try {
    dataUrl = await toPng(node, {
      cacheBust: false,
      pixelRatio,
      width: dimensions.width,
      height: dimensions.height,
      canvasWidth: dimensions.width,
      canvasHeight: dimensions.height,
      style: exportStyle,
    });
  } catch (err) {
    console.warn("[product-card-export] Retrying card export with skipFonts fallback...", err);
    dataUrl = await toPng(node, {
      cacheBust: false,
      skipFonts: true,
      pixelRatio,
      width: dimensions.width,
      height: dimensions.height,
      canvasWidth: dimensions.width,
      canvasHeight: dimensions.height,
      style: exportStyle,
    });
  }

  const safeFilename = filename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 50);
  const link = document.createElement("a");
  link.download = `${safeFilename}-${format}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return dataUrl;
}

/**
 * Render node to Blob for native sharing or clipboard
 */
export async function getProductCardBlob(
  node: HTMLElement,
  format: ProductCardFormat = "whatsapp-status",
  pixelRatio = 2,
): Promise<Blob> {
  const { toBlob } = await import("html-to-image");
  const dimensions = productCardFormats[format];

  await ensureImagesReady(node);

  const exportStyle: Partial<CSSStyleDeclaration> = {
    transform: "none",
    transformOrigin: "top left",
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    maxWidth: "none",
    maxHeight: "none",
    margin: "0",
  };

  const blob = await toBlob(node, {
    cacheBust: false,
    pixelRatio,
    width: dimensions.width,
    height: dimensions.height,
    canvasWidth: dimensions.width,
    canvasHeight: dimensions.height,
    style: exportStyle,
  });

  if (!blob) {
    throw new Error("Failed to create image blob");
  }

  return blob;
}

/**
 * Check if the browser supports sharing image files via Web Share API
 */
export function canNativeShareImage(): boolean {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    const file = new File(["dummy"], "probe.png", { type: "image/png" });
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * Native share image file (opens mobile share drawer for WhatsApp, Stories, etc.)
 */
export async function nativeShareProductCard(
  options: ProductCardExportOptions,
  meta: { title: string; text?: string; url?: string },
): Promise<boolean> {
  const { node, filename = "zango-product-card", format = "whatsapp-status" } = options;
  const blob = await getProductCardBlob(node, format);
  const safeFilename = filename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 50);
  const file = new File([blob], `${safeFilename}-${format}.png`, { type: "image/png" });

  if (canNativeShareImage()) {
    try {
      await navigator.share({
        files: [file],
        title: meta.title,
        text: meta.text,
        url: meta.url,
      });
      return true;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return false; // User dismissed
      }
      throw err;
    }
  }

  // Fallback: download the image
  await exportProductCard(options);
  return false;
}

/**
 * Copy image directly to user clipboard
 */
export async function copyProductCardToClipboard(
  node: HTMLElement,
  format: ProductCardFormat = "square",
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.write) {
    throw new Error("Clipboard image write not supported in this browser");
  }

  const blob = await getProductCardBlob(node, format, 2);
  const item = new ClipboardItem({ "image/png": blob });
  await navigator.clipboard.write([item]);
  return true;
}

/**
 * Direct WhatsApp Share Helper
 */
export async function shareProductCardToWhatsApp(
  options: ProductCardExportOptions,
  product: { id: string; name: string; price?: number | string | null },
  seller: { business_name?: string; whatsapp_number?: string; slug?: string | null },
): Promise<void> {
  const storeUrl = getProductStoreUrl(seller.slug, product.id);
  const priceStr =
    product.price && Number(product.price) > 0
      ? `₦${Number(product.price).toLocaleString()}`
      : "Contact for price";

  const messageText = `✨ *${product.name}* (${priceStr})\nFrom *${seller.business_name || "Verified Store"}* on ZANGO.\n\n🛒 View & Order: ${storeUrl}\n💬 WhatsApp: ${seller.whatsapp_number || ""}`;

  // First trigger card download so vendor has the high-res card ready
  await exportProductCard(options);

  // Open WhatsApp with text
  const cleanNum = (seller.whatsapp_number || "").replace(/[^\d]/g, "");
  const waUrl = cleanNum
    ? `https://wa.me/${cleanNum}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  if (typeof window !== "undefined") {
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }
}

export interface BatchExportItem {
  product: {
    id: string;
    name: string;
    price?: number | string | null;
    image_url?: string | null;
    stock_status?: string | null;
  };
  seller: {
    id: string;
    business_name: string;
    city?: string | null;
    whatsapp_number: string;
    slug?: string | null;
    is_verified?: boolean;
    profile_photo_url?: string | null;
  };
}

export interface BatchExportProgress {
  current: number;
  total: number;
  productName: string;
  status: "rendering" | "downloading" | "done" | "cancelled" | "error";
}

/**
 * Sequential batch export for multiple products with staggered delays
 * ensuring browsers don't suppress multiple rapid downloads.
 */
export async function batchExportCardsSequentially({
  items,
  renderNode,
  format = "whatsapp-status",
  onProgress,
  signal,
  delayMs = 450,
}: {
  items: BatchExportItem[];
  renderNode: (item: BatchExportItem) => Promise<HTMLElement | null>;
  format?: ProductCardFormat;
  onProgress?: (progress: BatchExportProgress) => void;
  signal?: AbortSignal;
  delayMs?: number;
}): Promise<{ total: number; successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) {
      onProgress?.({
        current: i,
        total: items.length,
        productName: items[i].product.name,
        status: "cancelled",
      });
      break;
    }

    const item = items[i];
    onProgress?.({
      current: i + 1,
      total: items.length,
      productName: item.product.name,
      status: "rendering",
    });

    try {
      const node = await renderNode(item);
      if (!node) {
        throw new Error(`Failed to render canvas for product ${item.product.name}`);
      }

      onProgress?.({
        current: i + 1,
        total: items.length,
        productName: item.product.name,
        status: "downloading",
      });

      const filename = `zango-${(item.product.name || "product")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 30)}`;

      await exportProductCardCanvas(node, format, filename, 2);
      successful++;

      // Polite delay between downloads to prevent browser throttling/pop-up blocking
      if (i < items.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (err) {
      console.error(`[batchExport] Failed to export "${item.product.name}":`, err);
      failed++;
    }
  }

  onProgress?.({
    current: items.length,
    total: items.length,
    productName: "Complete",
    status: "done",
  });

  return { total: items.length, successful, failed };
}
