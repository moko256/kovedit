import { describe, expect, test } from "vitest";
import { createDefaultTrackProperties } from "../properties";
import { createMediaClip, createTextClip, type Project } from "../types";
import {
  activeDrawableObjectsAtPlayhead,
  activeObjectsAtPlayhead,
  sceneObjectKey,
} from "./scene";

function sampleProject(): Project {
  return {
    info: { fps: 30 },
    tracks: [
      {
        items: [
          createMediaClip({
            objectType: "video",
            path: "blob:video",
            name: "video.mp4",
            sourceDurationFrames: 30,
          }),
        ],
        properties: createDefaultTrackProperties(),
      },
      {
        items: [createTextClip({ text: "Title", durationFrames: 30 })],
        properties: createDefaultTrackProperties(),
      },
      {
        items: [
          createMediaClip({
            objectType: "audio",
            path: "blob:audio",
            name: "audio.mp3",
            sourceDurationFrames: 30,
          }),
        ],
        properties: createDefaultTrackProperties(),
      },
    ],
  };
}

describe("render scene", () => {
  test("lists media and text objects active at the playhead", () => {
    const project = sampleProject();
    const active = activeObjectsAtPlayhead(project, 0);
    expect(active.map((object) => object.objectType)).toEqual([
      "video",
      "text",
      "audio",
    ]);
    expect(active[1]?.text).toBe("Title");
    expect(active[0]?.mediaTimeSeconds).toBeCloseTo(0, 5);
  });

  test("drawable filter keeps video and text only", () => {
    const project = sampleProject();
    const drawable = activeDrawableObjectsAtPlayhead(project, 0);
    expect(drawable.map((object) => object.objectType)).toEqual([
      "video",
      "text",
    ]);
    expect(drawable.every((object) => object.drawable)).toBe(true);
  });

  test("scene object keys are stable per track item", () => {
    const project = sampleProject();
    const [video] = activeObjectsAtPlayhead(project, 0);
    expect(video).toBeTruthy();
    expect(sceneObjectKey(video!)).toBe("0:0:video");
  });
});
