import { describe, expect, test } from "vitest";
import { timelineFrameFromPointer } from "./timeline-scrub";

describe("timelineFrameFromPointer", () => {
  test("maps pointer x into clamped timeline frames", () => {
    expect(timelineFrameFromPointer(101, 100, 2, 200)).toBe(0);
    expect(timelineFrameFromPointer(140, 100, 2, 200)).toBe(20);
    expect(timelineFrameFromPointer(180, 100, 2, 200)).toBe(40);
    expect(timelineFrameFromPointer(50, 100, 2, 200)).toBe(0);
    expect(timelineFrameFromPointer(900, 100, 2, 40)).toBe(40);
  });

  test("returns 0 when pixelsPerFrame is non-positive", () => {
    expect(timelineFrameFromPointer(140, 100, 0, 200)).toBe(0);
    expect(timelineFrameFromPointer(140, 100, -2, 200)).toBe(0);
  });
});
