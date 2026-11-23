import { afterEach, describe, expect, test, vi } from "vitest";
import { MainAction } from "./MainAction.svelte";
import { MainStore } from "./MainStore.svelte";
import { createDefaultTrackProperties } from "./properties";
import { itemStartFrame } from "./track-layout";
import type { ClipNode, Project } from "./types";

function projectWithClip(durationFrames = 30): {
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
      ["durationFrames", durationFrames],
    ]),
  };
  const project: Project = {
    info: { fps: 30 },
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

afterEach(() => {
  vi.useRealTimers();
});

function clipStart(store: MainStore, clip: ClipNode): number {
  const items = store.project.tracks[0].items;
  return itemStartFrame(items, items.indexOf(clip));
}

describe("MainAction clip drag history", () => {
  test("begin/move/end records undoable clip moves", () => {
    const { store, action, clip } = projectWithClip();
    action.beginClipDrag(0, 0);
    action.moveClip(0, 0, 40);
    expect(clipStart(store, clip)).toBe(40);
    action.endClipDrag();

    expect(store.undoStack).toHaveLength(1);
    action.undo();
    expect(clipStart(store, clip)).toBe(0);
    expect(store.redoStack).toHaveLength(1);

    action.redo();
    expect(clipStart(store, clip)).toBe(40);
  });

  test("endClipDrag without a move does not push history", () => {
    const { store, action } = projectWithClip();
    action.beginClipDrag(0, 0);
    action.endClipDrag();
    expect(store.undoStack).toHaveLength(0);
  });

  test("undo is ignored while a clip drag is pending", () => {
    const { store, action, clip } = projectWithClip();
    action.beginClipDrag(0, 0);
    action.moveClip(0, 0, 40);
    action.endClipDrag();
    const draggedIndex = store.project.tracks[0].items.indexOf(clip);
    action.beginClipDrag(0, draggedIndex);
    action.undo();
    expect(clipStart(store, clip)).toBe(40);
    expect(store.undoStack).toHaveLength(1);
  });
});

describe("MainAction transport", () => {
  test("seek clamps to the project playhead range", () => {
    const { store, action } = projectWithClip(30);
    action.seek(999);
    expect(store.playheadFrame).toBe(60);
    action.seek(-4);
    expect(store.playheadFrame).toBe(0);
  });

  test("nudgePlayhead steps one playhead frame", () => {
    const { store, action } = projectWithClip(60);
    action.seek(80);
    action.nudgePlayhead(-1);
    expect(store.playheadFrame).toBe(79);
    action.nudgePlayhead(1);
    expect(store.playheadFrame).toBe(80);
  });

  test("togglePlay starts and stops playback", () => {
    vi.useFakeTimers();
    vi.spyOn(performance, "now").mockReturnValue(0);
    const { store, action } = projectWithClip(30);

    action.togglePlay();
    expect(store.playing).toBe(true);
    action.togglePlay();
    expect(store.playing).toBe(false);
  });

  test("seek while playing resets the play origin", () => {
    vi.useFakeTimers();
    const now = vi.spyOn(performance, "now");
    now.mockReturnValue(0);
    const { store, action } = projectWithClip(60);

    action.play();
    const epoch = store.transportEpoch;
    now.mockReturnValue(1000);
    action.seek(40);
    expect(store.playheadFrame).toBe(40);
    expect(store.transportEpoch).toBe(epoch + 1);
    expect(store.playing).toBe(true);
  });
});
