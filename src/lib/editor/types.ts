import {
  clonePropertyLayer,
  createDefaultTrackProperties,
  type PropertyLayer,
} from "./properties";

export type ProjectInfo = {
  fps?: number;
};

export const CLIP_PROP_LAYER = "layer";

export type ClipNode = {
  properties: Map<string, unknown>;
};

export type SpaceNode = {
  space: number;
};

export type TrackItem = ClipNode | SpaceNode;

export type VideoTrack = {
  type: "video";
  items: TrackItem[];
  properties: PropertyLayer;
};

export type Project = {
  info: ProjectInfo;
  tracks: VideoTrack[];
};

export type ClipSelection = {
  type: "clip";
  trackIndex: number;
  itemIndex: number;
};

export type TrackSelection = {
  type: "track";
  trackIndex: number;
};

export type EditorSelection = ClipSelection | TrackSelection;

export function isSpaceNode(item: TrackItem): item is SpaceNode {
  return Object.hasOwn(item, "space");
}

export function isClipNode(item: TrackItem): item is ClipNode {
  return Object.hasOwn(item, "properties");
}

export function createEmptyProject(): Project {
  return {
    info: {},
    tracks: [
      { type: "video", items: [], properties: createDefaultTrackProperties() },
    ],
  };
}

export function createVideoTrack(): VideoTrack {
  return {
    type: "video",
    items: [],
    properties: createDefaultTrackProperties(),
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

export function clipPropertyLayer(clip: ClipNode): PropertyLayer {
  const value = clip.properties.get(CLIP_PROP_LAYER);
  if (!value || typeof value !== "object") {
    return {};
  }
  return clonePropertyLayer(value as PropertyLayer);
}

export function setClipPropertyLayer(
  clip: ClipNode,
  layer: PropertyLayer,
): void {
  clip.properties.set(CLIP_PROP_LAYER, clonePropertyLayer(layer));
}

export function cloneClipProperties(clip: ClipNode): Map<string, unknown> {
  const next = new Map<string, unknown>();
  for (const [key, value] of clip.properties) {
    if (key === CLIP_PROP_LAYER && value && typeof value === "object") {
      next.set(key, clonePropertyLayer(value as PropertyLayer));
      continue;
    }
    next.set(key, value);
  }
  return next;
}

export function restoreClipProperties(
  clip: ClipNode,
  properties: Map<string, unknown>,
): void {
  clip.properties.clear();
  for (const [key, value] of properties) {
    if (key === CLIP_PROP_LAYER && value && typeof value === "object") {
      clip.properties.set(key, clonePropertyLayer(value as PropertyLayer));
      continue;
    }
    clip.properties.set(key, value);
  }
}

export function cloneTrackProperties(track: VideoTrack): PropertyLayer {
  return clonePropertyLayer(track.properties);
}

export function restoreTrackProperties(
  track: VideoTrack,
  properties: PropertyLayer,
): void {
  track.properties = clonePropertyLayer(properties);
}
