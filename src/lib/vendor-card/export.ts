import { vendorCardFormats } from "./themes";
import type { VendorCardExportOptions, VendorCardFormat } from "./types";

async function exportVendorCard({ node, filename = "zango-vendor-card", format = "instagram-portrait", pixelRatio = 2 }: VendorCardExportOptions) {
  const { toPng } = await import("html-to-image");
  const dimensions = vendorCardFormats[format];
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio,
    width: dimensions.width,
    height: dimensions.height,
    canvasWidth: dimensions.width,
    canvasHeight: dimensions.height,
    backgroundColor: "#FCF9F5",
    style: { transform: "none", width: `${dimensions.width}px`, height: `${dimensions.height}px` },
  });
  const link = document.createElement("a");
  link.download = `${filename}-${format}.png`;
  link.href = dataUrl;
  link.click();
  return dataUrl;
}

export function generateVendorCard(options: VendorCardExportOptions) {
  return exportVendorCard(options);
}

export function downloadVendorCard(node: HTMLElement, filename?: string, format: VendorCardFormat = "instagram-portrait") {
  return exportVendorCard({ node, filename, format });
}

export function downloadVendorStory(node: HTMLElement, filename?: string) {
  return exportVendorCard({ node, filename, format: "story" });
}

export function downloadVendorFlyer(node: HTMLElement, filename?: string) {
  return exportVendorCard({ node, filename, format: "a4-flyer", pixelRatio: 2.5 });
}
