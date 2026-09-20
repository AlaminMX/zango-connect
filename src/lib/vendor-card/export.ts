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

  let dataUrl: string;
  try {
    dataUrl = await toPng(node, {
      cacheBust: false,
      skipFonts: true,
      pixelRatio,
      width: dimensions.width,
      height: dimensions.height,
      canvasWidth: dimensions.width,
      canvasHeight: dimensions.height,
      backgroundColor: "#F7F2EB",
      style: { transform: "none", width: `${dimensions.width}px`, height: `${dimensions.height}px` },
    });
  } catch (err) {
    console.warn("Retrying card export with fallback...", err);
    dataUrl = await toPng(node, {
      cacheBust: false,
      skipFonts: true,
      pixelRatio: 1.5,
      backgroundColor: "#F7F2EB",
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
