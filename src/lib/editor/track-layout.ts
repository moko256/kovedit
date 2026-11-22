import {
  clipDurationFrames,
  isClipNode,
  isSpaceNode,
  type ClipNode,
  type TrackItem,
} from "./types";

export type LayoutEntry = {
  itemIndex: number;
  startFrame: number;
  lengthFrames: number;
  kind: "clip" | "space";
};

function itemLength(item: TrackItem): number {
  return isSpaceNode(item)
    ? Math.max(0, Math.floor(item.space))
    : clipDurationFrames(item);
}

export function layoutTrack(items: TrackItem[]): LayoutEntry[] {
  const layout: LayoutEntry[] = [];
  let frame = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const lengthFrames = itemLength(item);
    layout.push({
      itemIndex: i,
      startFrame: frame,
      lengthFrames,
      kind: isSpaceNode(item) ? "space" : "clip",
    });
    frame += lengthFrames;
  }
  return layout;
}

export function totalTrackFrames(items: TrackItem[]): number {
  let total = 0;
  for (const item of items) {
    total += itemLength(item);
  }
  return total;
}

export function itemStartFrame(items: TrackItem[], itemIndex: number): number {
  let frame = 0;
  for (let i = 0; i < itemIndex && i < items.length; i++) {
    frame += itemLength(items[i]);
  }
  return frame;
}

function pushSpace(result: TrackItem[], frames: number): void {
  const space = Math.max(0, Math.floor(frames));
  if (space <= 0) {
    return;
  }
  const last = result[result.length - 1];
  if (last && isSpaceNode(last)) {
    result[result.length - 1] = { space: last.space + space };
    return;
  }
  result.push({ space });
}

function compactItems(items: TrackItem[]): TrackItem[] {
  const result: TrackItem[] = [];
  for (const item of items) {
    if (isSpaceNode(item)) {
      pushSpace(result, item.space);
      continue;
    }
    result.push(item);
  }
  return result;
}

function removeItemMergingSpaces(
  items: TrackItem[],
  itemIndex: number,
): TrackItem[] {
  const result: TrackItem[] = [];
  for (let i = 0; i < items.length; i++) {
    if (i === itemIndex) {
      continue;
    }
    const item = items[i];
    if (isSpaceNode(item)) {
      pushSpace(result, item.space);
    } else {
      result.push(item);
    }
  }
  return result;
}

export function insertClipAtFrame(
  items: TrackItem[],
  clip: ClipNode,
  targetFrame: number,
): TrackItem[] {
  const frame = Math.max(0, Math.floor(targetFrame));
  const layout = layoutTrack(items);
  const total = totalTrackFrames(items);

  if (frame >= total) {
    const result = compactItems(items);
    pushSpace(result, frame - total);
    result.push(clip);
    return result;
  }

  for (const entry of layout) {
    const end = entry.startFrame + entry.lengthFrames;
    if (frame < entry.startFrame || frame >= end) {
      continue;
    }

    if (entry.kind === "space") {
      const before = frame - entry.startFrame;
      const after = end - frame;
      const result: TrackItem[] = [];
      for (let i = 0; i < items.length; i++) {
        if (i !== entry.itemIndex) {
          const item = items[i];
          if (isSpaceNode(item)) {
            pushSpace(result, item.space);
          } else {
            result.push(item);
          }
          continue;
        }
        pushSpace(result, before);
        result.push(clip);
        pushSpace(result, after);
      }
      return result;
    }

    const result: TrackItem[] = [];
    for (let i = 0; i < items.length; i++) {
      if (i === entry.itemIndex) {
        result.push(clip);
      }
      const item = items[i];
      if (isSpaceNode(item)) {
        pushSpace(result, item.space);
      } else {
        result.push(item);
      }
    }
    return result;
  }

  const fallback = compactItems(items);
  fallback.push(clip);
  return fallback;
}

export function moveClipToFrame(
  items: TrackItem[],
  itemIndex: number,
  newStartFrame: number,
): TrackItem[] {
  if (itemIndex < 0 || itemIndex >= items.length) {
    return items;
  }
  const clip = items[itemIndex];
  if (!isClipNode(clip)) {
    return items;
  }
  const without = removeItemMergingSpaces(items, itemIndex);
  return insertClipAtFrame(
    without,
    clip,
    Math.max(0, Math.floor(newStartFrame)),
  );
}
