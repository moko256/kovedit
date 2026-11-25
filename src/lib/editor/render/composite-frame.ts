import { COMPOSITION_HEIGHT, COMPOSITION_WIDTH } from "../composition";
import { buildDrawableSvg } from "./drawable-svg";
import {
  drawImageWithTransform,
  drawSvgMarkupWithTransform,
} from "./canvas-draw";
import { getMediaCanvasFrame } from "./media-decode";
import type { ActiveSceneObject } from "./scene";

export type FrameCanvas = HTMLCanvasElement | OffscreenCanvas;

export function createCompositionCanvas(
  width = COMPOSITION_WIDTH,
  height = COMPOSITION_HEIGHT,
): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function clearCompositionFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width = COMPOSITION_WIDTH,
  height = COMPOSITION_HEIGHT,
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export async function compositeSceneObject(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  object: ActiveSceneObject,
): Promise<void> {
  if (!object.drawable) {
    return;
  }

  if (object.objectType === "text") {
    const markup = buildDrawableSvg({
      kind: "text",
      text: object.text,
      width: Math.max(1, object.transform.width),
      height: Math.max(1, object.transform.height),
    });
    await drawSvgMarkupWithTransform(ctx, markup, object.transform);
    return;
  }

  if (object.objectType === "video") {
    if (!object.path) {
      return;
    }
    const frame = await getMediaCanvasFrame(
      object.path,
      object.mediaTimeSeconds,
      {
        width: Math.max(1, Math.round(object.transform.width)),
        height: Math.max(1, Math.round(object.transform.height)),
      },
    );
    if (!frame) {
      return;
    }
    drawImageWithTransform(ctx, frame.canvas, object.transform);
  }
}

export async function compositeSceneFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  objects: ActiveSceneObject[],
  width = COMPOSITION_WIDTH,
  height = COMPOSITION_HEIGHT,
): Promise<void> {
  clearCompositionFrame(ctx, width, height);
  for (const object of objects) {
    await compositeSceneObject(ctx, object);
  }
}
