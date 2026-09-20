import { vendorCardFormats } from "./themes";
import type { VendorCardExportOptions, VendorCardFormat } from "./types";

async function exportVendorCard({
  node,
  filename = "zango-vendor-card",
  format = "landscape",
  pixelRatio = 2,
}: VendorCardExportOptions) {
  const { toPng } = await import("html-to-image");
  const dimensions = vendorCardFormats[format];

  // Wait for all web fonts to finish loading so the typography exactly matches the preview
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font readiness errors if unsupported
    }
  }

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
    console.warn("Retrying card export with fallback...", err);
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

  const link = document.createElement("a");
  link.download = `${filename}-${format}.png`;
  link.href = dataUrl;
  link.click();
  return dataUrl;
}

export function generateVendorCard(options: VendorCardExportOptions) {
  return exportVendorCard(options);
}

export function downloadVendorCard(
  node: HTMLElement,
  filename?: string,
  format: VendorCardFormat = "landscape",
) {
  return exportVendorCard({ node, filename, format });
}

export function downloadVendorStory(node: HTMLElement, filename?: string) {
  return exportVendorCard({ node, filename, format: "story" });
}

export function downloadVendorFlyer(node: HTMLElement, filename?: string) {
  return exportVendorCard({ node, filename, format: "a4-flyer", pixelRatio: 2.5 });
}
