import type { ProductShareCardExportOptions } from "./types";

// Instagram feed square — 1080×1080 is Instagram's own recommended square post size.
export const PRODUCT_SHARE_CARD_WIDTH = 1080;
export const PRODUCT_SHARE_CARD_HEIGHT = 1080;

const CAPTURE_STYLE = {
  transform: "none",
  width: `${PRODUCT_SHARE_CARD_WIDTH}px`,
  height: `${PRODUCT_SHARE_CARD_HEIGHT}px`,
};

async function toPngDataUrl(node: HTMLElement, pixelRatio = 2) {
  const { toPng } = await import("html-to-image");
  return toPng(node, {
    cacheBust: true,
    pixelRatio,
    width: PRODUCT_SHARE_CARD_WIDTH,
    height: PRODUCT_SHARE_CARD_HEIGHT,
    canvasWidth: PRODUCT_SHARE_CARD_WIDTH,
    canvasHeight: PRODUCT_SHARE_CARD_HEIGHT,
    backgroundColor: "#FCF9F5",
    style: CAPTURE_STYLE,
  });
}

async function toPngBlob(node: HTMLElement, pixelRatio = 2) {
  const { toBlob } = await import("html-to-image");
  const blob = await toBlob(node, {
    cacheBust: true,
    pixelRatio,
    width: PRODUCT_SHARE_CARD_WIDTH,
    height: PRODUCT_SHARE_CARD_HEIGHT,
    canvasWidth: PRODUCT_SHARE_CARD_WIDTH,
    canvasHeight: PRODUCT_SHARE_CARD_HEIGHT,
    backgroundColor: "#FCF9F5",
    style: CAPTURE_STYLE,
  });
  if (!blob) throw new Error("Could not render the card image.");
  return blob;
}

/** Downloads the card as a PNG file (desktop, or mobile browsers without Web Share support). */
export async function downloadProductShareCard({ node, filename = "zango-product" }: ProductShareCardExportOptions) {
  const dataUrl = await toPngDataUrl(node);
  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
  return dataUrl;
}

/** Whether the browser supports sharing an image file via the native OS share sheet. */
export function canNativeShareImage() {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    const probe = new File([""], "probe.png", { type: "image/png" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** Opens the OS share sheet (Instagram, WhatsApp, etc.) with the card image attached. */
export async function nativeShareProductCard({ node, filename = "zango-product" }: ProductShareCardExportOptions, shareText: string) {
  const blob = await toPngBlob(node);
  const file = new File([blob], `${filename}.png`, { type: "image/png" });
  await navigator.share({ files: [file], text: shareText });
}
