import { describe, expect, test } from "vitest";
import { MainAction } from "./MainAction.svelte";
import { MainStore } from "./MainStore.svelte";
import { createDefaultTrackProperties } from "./properties";
import { totalTrackFrames } from "./track-layout";
import {
  clipDurationFrames,
  clipObjectType,
  createMediaClip,
  createTextClip,
  type ClipNode,
  type Project,
} from "./types";

function projectWithMedia(): {
  store: MainStore;
  action: MainAction;
  clip: ClipNode;
} {
  const store = new MainStore();
  const action = new MainAction(store);
  const clip = createMediaClip({
    objectType: "video",
    path: "blob:test",
    name: "sample.mp4",
    sourceDurationFrames: 120,
  });
  const project: Project = {
    info: {},
    tracks: [
      {
        items: [clip],
        properties: createDefaultTrackProperties(),
      },
    ],
  };
  store.project = project;
  store.selection = { type: "clip", trackIndex: 0, itemIndex: 0 };
  return { store, action, clip };
}

describe("MainAction object model", () => {
  test("setPlaybackRate shortens timeline length", () => {
    const { store, action, clip } = projectWithMedia();
    expect(totalTrackFrames(store.project.tracks[0].items)).toBe(120);

    action.setPlaybackRate(2);

    expect(clipDurationFrames(clip)).toBe(60);
    expect(totalTrackFrames(store.project.tracks[0].items)).toBe(60);
  });

  test("insertTextObject places a text clip on any track", () => {
    const store = new MainStore();
    const action = new MainAction(store);
    action.insertTextObject(0, 0);
    const track = store.project.tracks[0];
    const clip = track.items[0];
    expect(clip && "properties" in clip).toBe(true);
    if (!clip || !("properties" in clip)) {
      return;
    }
    expect(clipObjectType(clip)).toBe("text");
    expect(clipDurationFrames(clip)).toBe(90);
  });

  test("text clips ignore playback rate edits", () => {
    const store = new MainStore();
    const action = new MainAction(store);
    const clip = createTextClip({ durationFrames: 40 });
    store.project = {
      info: {},
      tracks: [
        {
          items: [clip],
          properties: createDefaultTrackProperties(),
        },
      ],
    };
    store.selection = { type: "clip", trackIndex: 0, itemIndex: 0 };
    action.setPlaybackRate(3);
    expect(clipDurationFrames(clip)).toBe(40);
  });
});
