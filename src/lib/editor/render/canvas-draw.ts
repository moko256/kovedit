import type { PreviewTransform } from "../properties";
import { svgMarkupToDataUrl } from "./drawable-svg";

export function applyPreviewTransform(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  transform: PreviewTransform,
): void {
  const originX = transform.left + transform.originX * transform.width;
  const originY = transform.top + transform.originY * transform.height;
  ctx.translate(originX, originY);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.translate(-originX, -originY);
  ctx.globalAlpha = transform.opacity;
}

export function drawImageWithTransform(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  source: CanvasImageSource,
  transform: PreviewTransform,
): void {
  ctx.save();
  applyPreviewTransform(ctx, transform);
  ctx.drawImage(
    source,
    transform.left,
    transform.top,
    Math.max(1, transform.width),
    Math.max(1, transform.height),
  );
  ctx.restore();
}

export async function loadImageBitmapFromUrl(
  url: string,
): Promise<ImageBitmap> {
  const response = await fetch(url);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

export async function drawSvgMarkupWithTransform(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  markup: string,
  transform: PreviewTransform,
): Promise<void> {
  const bitmap = await loadImageBitmapFromUrl(svgMarkupToDataUrl(markup));
  try {
    drawImageWithTransform(ctx, bitmap, transform);
  } finally {
    bitmap.close();
  }
}
