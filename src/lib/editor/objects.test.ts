import { describe, expect, test } from "vitest";
import {
  isDrawableObjectType,
  isMediaObjectType,
  isObjectType,
  normalizePlaybackRate,
  timelineDurationFromSource,
  type ObjectType,
} from "./objects";

describe("object type classification", () => {
  test("classifies media and drawable groups", () => {
    const cases: Array<{
      type: ObjectType;
      media: boolean;
      drawable: boolean;
    }> = [
      { type: "video", media: true, drawable: true },
      { type: "audio", media: true, drawable: false },
      { type: "text", media: false, drawable: true },
    ];
    for (const entry of cases) {
      expect(isMediaObjectType(entry.type)).toBe(entry.media);
      expect(isDrawableObjectType(entry.type)).toBe(entry.drawable);
    }
  });

  test("accepts only known object types", () => {
    expect(isObjectType("video")).toBe(true);
    expect(isObjectType("audio")).toBe(true);
    expect(isObjectType("text")).toBe(true);
    expect(isObjectType("image")).toBe(false);
    expect(isObjectType(null)).toBe(false);
  });
});

describe("playback rate and timeline duration", () => {
  test("faster rate shortens timeline length", () => {
    expect(timelineDurationFromSource(120, 2)).toBe(60);
    expect(timelineDurationFromSource(120, 0.5)).toBe(240);
  });

  test("rejects non-positive rates", () => {
    expect(normalizePlaybackRate(0)).toBe(1);
    expect(normalizePlaybackRate(-2)).toBe(1);
    expect(normalizePlaybackRate(Number.NaN)).toBe(1);
    expect(timelineDurationFromSource(90, 0)).toBe(90);
  });

  test("zero source stays zero", () => {
    expect(timelineDurationFromSource(0, 2)).toBe(0);
  });
});
