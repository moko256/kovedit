import {
  COMPOSITION_DEFAULT_CENTER_X,
  COMPOSITION_DEFAULT_CENTER_Y,
  type CompositionCenter,
} from "./composition";

export type ProjectInfo = {
  fps?: number;
};

export type ClipNode = {
  properties: Map<string, unknown>;
};

export const CLIP_PROP_CENTER_X = "centerX";
export const CLIP_PROP_CENTER_Y = "centerY";

export type SpaceNode = {
  space: number;
};

export type TrackItem = ClipNode | SpaceNode;

export type VideoTrack = {
  type: "video";
  items: TrackItem[];
};

export type Project = {
  info: ProjectInfo;
  tracks: VideoTrack[];
};

export type ClipSelection = {
  trackIndex: number;
  itemIndex: number;
};

export function isSpaceNode(item: TrackItem): item is SpaceNode {
  return Object.hasOwn(item, "space");
}

export function isClipNode(item: TrackItem): item is ClipNode {
  return Object.hasOwn(item, "properties");
}

export function createEmptyProject(): Project {
  return {
    info: {},
    tracks: [{ type: "video", items: [] }],
  };
}

export function clipPath(clip: ClipNode): string {
  const value = clip.properties.get("path");
  return typeof value === "string" ? value : "";
}

export function clipDurationFrames(clip: ClipNode): number {
  const value = clip.properties.get("durationFrames");
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

export function clipName(clip: ClipNode): string {
  const value = clip.properties.get("name");
  return typeof value === "string" ? value : "clip";
}

export function clipCenter(clip: ClipNode): CompositionCenter {
  const x = clip.properties.get(CLIP_PROP_CENTER_X);
  const y = clip.properties.get(CLIP_PROP_CENTER_Y);
  return {
    x:
      typeof x === "number" && Number.isFinite(x)
        ? x
        : COMPOSITION_DEFAULT_CENTER_X,
    y:
      typeof y === "number" && Number.isFinite(y)
        ? y
        : COMPOSITION_DEFAULT_CENTER_Y,
  };
}

export function cloneClipProperties(clip: ClipNode): Map<string, unknown> {
  return new Map(clip.properties);
}

export function restoreClipProperties(
  clip: ClipNode,
  properties: Map<string, unknown>,
): void {
  clip.properties.clear();
  for (const [key, value] of properties) {
    clip.properties.set(key, value);
  }
}
