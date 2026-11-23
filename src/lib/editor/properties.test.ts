import { describe, expect, test } from "vitest";
import {
  createDefaultTrackProperties,
  createStaticChannel,
  evaluateChannel,
  proportionalHeight,
  proportionalWidth,
  resolveProperties,
  upsertKeyframe,
  type PropertyLayer,
} from "./properties";

describe("properties resolution", () => {
  test("prefers object overrides over track", () => {
    const track = createDefaultTrackProperties();
    const object: PropertyLayer = {
      x: createStaticChannel(100),
      opacity: createStaticChannel(0.25),
    };
    const resolved = resolveProperties(track, object, 0);
    expect(resolved.x.value).toBe(100);
    expect(resolved.x.source).toBe("object");
    expect(resolved.y.value).toBe(540);
    expect(resolved.y.source).toBe("track");
    expect(resolved.opacity.value).toBe(0.25);
    expect(resolved.opacity.source).toBe("object");
    expect(resolved.width.source).toBe("track");
  });

  test("object can override track animation at a frame", () => {
    const track = createDefaultTrackProperties();
    track.x = {
      interpolation: "linear",
      keyframes: [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ],
    };
    const object: PropertyLayer = {
      x: createStaticChannel(7),
    };
    const without = resolveProperties(track, undefined, 5);
    const withObject = resolveProperties(track, object, 5);
    expect(without.x.value).toBe(50);
    expect(without.x.source).toBe("track");
    expect(withObject.x.value).toBe(7);
    expect(withObject.x.source).toBe("object");
  });
});

describe("keyframe interpolation", () => {
  test("linear blends numeric keyframes", () => {
    const channel = {
      interpolation: "linear" as const,
      keyframes: [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ],
    };
    expect(evaluateChannel(channel, "x", 0)).toBe(0);
    expect(evaluateChannel(channel, "x", 5)).toBe(50);
    expect(evaluateChannel(channel, "x", 10)).toBe(100);
    expect(evaluateChannel(channel, "x", 20)).toBe(100);
  });

  test("hold keeps left keyframe until next", () => {
    const channel = {
      interpolation: "hold" as const,
      keyframes: [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ],
    };
    expect(evaluateChannel(channel, "x", 0)).toBe(0);
    expect(evaluateChannel(channel, "x", 5)).toBe(0);
    expect(evaluateChannel(channel, "x", 9)).toBe(0);
    expect(evaluateChannel(channel, "x", 10)).toBe(100);
  });
});

describe("aspect lock helpers", () => {
  test("keeps proportions", () => {
    const ratio = 1920 / 1080;
    expect(proportionalHeight(960, ratio)).toBe(540);
    expect(proportionalWidth(540, ratio)).toBe(960);
  });
});

describe("upsertKeyframe", () => {
  test("updates existing frame and inserts others", () => {
    const base = createStaticChannel(10);
    const withMid = upsertKeyframe(base, 5, 20);
    expect(withMid.keyframes).toEqual([
      { frame: 0, value: 10 },
      { frame: 5, value: 20 },
    ]);
    const replaced = upsertKeyframe(withMid, 5, 30);
    expect(replaced.keyframes).toEqual([
      { frame: 0, value: 10 },
      { frame: 5, value: 30 },
    ]);
  });
});
