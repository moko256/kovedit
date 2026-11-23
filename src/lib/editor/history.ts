import {
  isClipNode,
  isSpaceNode,
  type ClipNode,
  type TrackItem,
} from "./types";

export const UNDO_BUFFER_SIZE = 200;

export type HistoryIdentity = {
  trackIndex: number;
  itemIndex: number;
  clip: ClipNode;
};

export type HistoryEntry = {
  identity: HistoryIdentity;
  before: TrackItem[];
  after: TrackItem[];
  clipPropertiesBefore?: Map<string, unknown>;
  clipPropertiesAfter?: Map<string, unknown>;
};

export function cloneTrackItems(items: TrackItem[]): TrackItem[] {
  return items.map((item) =>
    isSpaceNode(item) ? { space: item.space } : item,
  );
}

export function trackItemsEqual(a: TrackItem[], b: TrackItem[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (isSpaceNode(left) && isSpaceNode(right)) {
      if (left.space !== right.space) {
        return false;
      }
      continue;
    }
    if (isClipNode(left) && isClipNode(right)) {
      if (left !== right) {
        return false;
      }
      continue;
    }
    return false;
  }
  return true;
}

export function pushUndoEntry(
  stack: HistoryEntry[],
  entry: HistoryEntry,
  max = UNDO_BUFFER_SIZE,
): HistoryEntry[] {
  const next = [...stack, entry];
  if (next.length <= max) {
    return next;
  }
  return next.slice(next.length - max);
}
