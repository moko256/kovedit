import { describe, expect, test } from "vitest";
import {
  clearMediaAssets,
  mediaAssetForPath,
  registerMediaAsset,
  unregisterMediaAsset,
} from "./media-assets";

describe("media assets", () => {
  test("registers blob paths for export-time mediabunny decode", () => {
    clearMediaAssets();
    const file = new File([new Uint8Array([1, 2, 3])], "clip.mp4", {
      type: "video/mp4",
    });
    registerMediaAsset("blob:clip", file);
    expect(mediaAssetForPath("blob:clip")).toBe(file);
    unregisterMediaAsset("blob:clip");
    expect(mediaAssetForPath("blob:clip")).toBeNull();
    clearMediaAssets();
  });
});
