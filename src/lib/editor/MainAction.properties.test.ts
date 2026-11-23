import { describe, expect, test } from "vitest";
import { MainAction } from "./MainAction.svelte";
import { MainStore } from "./MainStore.svelte";
import { createDefaultTrackProperties, resolveProperties } from "./properties";
import { clipPropertyLayer, type ClipNode, type Project } from "./types";

function projectWithClip(): {
  store: MainStore;
  action: MainAction;
  clip: ClipNode;
} {
  const store = new MainStore();
  const action = new MainAction(store);
  const clip: ClipNode = {
    properties: new Map<string, unknown>([
      ["path", "blob:test"],
      ["name", "sample.mp4"],
      ["durationFrames", 30],
    ]),
  };
  const project: Project = {
    info: {},
    tracks: [
      {
        type: "video",
        items: [clip],
        properties: createDefaultTrackProperties(),
      },
    ],
  };
  store.project = project;
  store.selection = { type: "clip", trackIndex: 0, itemIndex: 0 };
  return { store, action, clip };
}

describe("MainAction property layers", () => {
  test("editing an inherited object field creates an override", () => {
    const { store, action, clip } = projectWithClip();
    const before = resolveProperties(
      store.project.tracks[0].properties,
      clipPropertyLayer(clip),
      0,
    );
    expect(before.x.source).toBe("track");
    expect(before.x.value).toBe(960);

    action.setPropertyValue("x", 100, 0);

    const after = resolveProperties(
      store.project.tracks[0].properties,
      clipPropertyLayer(clip),
      0,
    );
    expect(after.x.source).toBe("object");
    expect(after.x.value).toBe(100);
    expect(after.y.source).toBe("track");
  });

  test("object property edits undo and redo", () => {
    const { store, action, clip } = projectWithClip();
    action.setPropertyValue("x", 100, 0);
    action.setPropertyValue("y", 200, 0);

    action.undo();
    expect(
      resolveProperties(
        store.project.tracks[0].properties,
        clipPropertyLayer(clip),
        0,
      ).y.value,
    ).toBe(540);
    expect(
      resolveProperties(
        store.project.tracks[0].properties,
        clipPropertyLayer(clip),
        0,
      ).x.value,
    ).toBe(100);

    action.undo();
    expect(
      resolveProperties(
        store.project.tracks[0].properties,
        clipPropertyLayer(clip),
        0,
      ).x.source,
    ).toBe("track");

    action.redo();
    expect(
      resolveProperties(
        store.project.tracks[0].properties,
        clipPropertyLayer(clip),
        0,
      ).x.value,
    ).toBe(100);

    action.redo();
    const restored = resolveProperties(
      store.project.tracks[0].properties,
      clipPropertyLayer(clip),
      0,
    );
    expect(restored.x.value).toBe(100);
    expect(restored.y.value).toBe(200);
  });

  test("track property edit updates defaults with undo", () => {
    const { store, action } = projectWithClip();
    store.selection = { type: "track", trackIndex: 0 };
    action.setPropertyValue("x", 50, 0);
    expect(store.project.tracks[0].properties.x?.keyframes[0]?.value).toBe(50);

    action.undo();
    expect(store.project.tracks[0].properties.x?.keyframes[0]?.value).toBe(960);
  });

  test("aspect lock keeps width/height proportional on object edit", () => {
    const { store, action, clip } = projectWithClip();
    action.setPropertyValue("width", 960, 0);
    const resolved = resolveProperties(
      store.project.tracks[0].properties,
      clipPropertyLayer(clip),
      0,
    );
    expect(resolved.width.value).toBe(960);
    expect(resolved.height.value).toBe(540);
    expect(resolved.height.source).toBe("object");
  });
});
