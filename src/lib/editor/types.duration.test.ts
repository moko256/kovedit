import { describe, expect, test } from "vitest";
import {
  clipDurationFrames,
  clipObjectType,
  clipPlaybackRate,
  createMediaClip,
  createTextClip,
  setClipPlaybackRate,
} from "./types";

describe("clip duration with media rate", () => {
  test("video clip duration scales with playback rate", () => {
    const clip = createMediaClip({
      objectType: "video",
      path: "blob:v",
      name: "clip.mp4",
      sourceDurationFrames: 100,
    });
    expect(clipObjectType(clip)).toBe("video");
    expect(clipDurationFrames(clip)).toBe(100);

    setClipPlaybackRate(clip, 2);
    expect(clipPlaybackRate(clip)).toBe(2);
    expect(clipDurationFrames(clip)).toBe(50);

    setClipPlaybackRate(clip, 0.5);
    expect(clipDurationFrames(clip)).toBe(200);
  });

  test("audio is media and respects rate", () => {
    const clip = createMediaClip({
      objectType: "audio",
      path: "blob:a",
      name: "clip.wav",
      sourceDurationFrames: 80,
      playbackRate: 2,
    });
    expect(clipObjectType(clip)).toBe("audio");
    expect(clipDurationFrames(clip)).toBe(40);
  });

  test("text duration is independent of playback rate", () => {
    const clip = createTextClip({ durationFrames: 45 });
    expect(clipObjectType(clip)).toBe("text");
    expect(clipDurationFrames(clip)).toBe(45);
    setClipPlaybackRate(clip, 4);
    expect(clipDurationFrames(clip)).toBe(45);
    expect(clipPlaybackRate(clip)).toBe(1);
  });

  test("legacy clips without objectType stay video at stored duration", () => {
    const clip = {
      properties: new Map<string, unknown>([
        ["path", "blob:legacy"],
        ["name", "legacy.mp4"],
        ["durationFrames", 60],
      ]),
    };
    expect(clipObjectType(clip)).toBe("video");
    expect(clipDurationFrames(clip)).toBe(60);
    setClipPlaybackRate(clip, 2);
    expect(clipDurationFrames(clip)).toBe(30);
  });
});
