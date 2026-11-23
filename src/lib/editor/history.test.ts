import { describe, expect, test } from "vitest";
import {
  cloneTrackItems,
  pushUndoEntry,
  trackItemsEqual,
  UNDO_BUFFER_SIZE,
  type HistoryEntry,
} from "./history";
import type { ClipNode, TrackItem } from "./types";

function clip(name: string): ClipNode {
  return {
    properties: new Map<string, unknown>([
      ["path", `blob:${name}`],
      ["name", name],
      ["durationFrames", 10],
    ]),
  };
}

function entry(before: TrackItem[], after: TrackItem[]): HistoryEntry {
  return {
    identity: { trackIndex: 0, itemIndex: 0, clip: null },
    before,
    after,
  };
}

describe("history helpers", () => {
  test("cloneTrackItems shallow-copies spaces and keeps clip identity", () => {
    const video = clip("a.mp4");
    const items: TrackItem[] = [{ space: 5 }, video, { space: 2 }];
    const cloned = cloneTrackItems(items);
    expect(cloned).not.toBe(items);
    expect(cloned[0]).toEqual({ space: 5 });
    expect(cloned[0]).not.toBe(items[0]);
    expect(cloned[1]).toBe(video);
  });

  test("trackItemsEqual compares spaces by value and clips by identity", () => {
    const a = clip("a.mp4");
    const b = clip("b.mp4");
    expect(trackItemsEqual([a, { space: 3 }], [a, { space: 3 }])).toBe(true);
    expect(trackItemsEqual([a, { space: 3 }], [a, { space: 4 }])).toBe(false);
    expect(trackItemsEqual([a], [b])).toBe(false);
    expect(trackItemsEqual([a], [{ space: 1 }])).toBe(false);
  });

  test("pushUndoEntry caps the stack at UNDO_BUFFER_SIZE", () => {
    let stack: HistoryEntry[] = [];
    for (let i = 0; i < UNDO_BUFFER_SIZE + 5; i++) {
      stack = pushUndoEntry(stack, entry([{ space: i }], [{ space: i + 1 }]));
    }
    expect(stack).toHaveLength(UNDO_BUFFER_SIZE);
    expect(stack[0]?.before[0]).toEqual({ space: 5 });
    expect(stack[stack.length - 1]?.before[0]).toEqual({
      space: UNDO_BUFFER_SIZE + 4,
    });
  });
});
