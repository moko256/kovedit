import { describe, expect, test } from "vitest";
import {
  DEFAULT_FPS,
  PLAYHEAD_FPS,
  playheadToTimelineFrames,
  projectFps,
  secondsToFrames,
  timelineFramesToPlayhead,
} from "./fps";

describe("fps helpers", () => {
  test("projectFps falls back to DEFAULT_FPS", () => {
    expect(projectFps({})).toBe(DEFAULT_FPS);
    expect(projectFps({ fps: 0 })).toBe(DEFAULT_FPS);
    expect(projectFps({ fps: 24 })).toBe(24);
  });

  test("converts between timeline and playhead frames at 30fps", () => {
    expect(timelineFramesToPlayhead(20, 30)).toBe(40);
    expect(timelineFramesToPlayhead(40, 30)).toBe(80);
    expect(playheadToTimelineFrames(80, 30)).toBe(40);
    expect(PLAYHEAD_FPS).toBe(60);
  });

  test("secondsToFrames rounds up to at least one frame", () => {
    expect(secondsToFrames(1, 30)).toBe(30);
    expect(secondsToFrames(0, 30)).toBe(1);
  });
});
