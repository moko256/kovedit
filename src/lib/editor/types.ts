import {
  DEFAULT_PLAYBACK_RATE,
  DEFAULT_TEXT_CONTENT,
  DEFAULT_TEXT_DURATION_FRAMES,
  isDrawableObjectType,
  isMediaObjectType,
  isObjectType,
  normalizePlaybackRate,
  timelineDurationFromSource,
  type ObjectType,
} from "./objects";
import {
  clonePropertyLayer,
  createDefaultTrackProperties,
  type PropertyLayer,
} from "./properties";

export type { ObjectType } from "./objects";
export {
  DEFAULT_PLAYBACK_RATE,
  DEFAULT_TEXT_CONTENT,
  DEFAULT_TEXT_DURATION_FRAMES,
  isDrawableObjectType,
  isMediaObjectType,
  isObjectType,
  OBJECT_TYPES,
  timelineDurationFromSource,
} from "./objects";

export type ProjectInfo = {
  fps?: number;
};

export const CLIP_PROP_LAYER = "layer";
export const CLIP_PROP_OBJECT_TYPE = "objectType";
export const CLIP_PROP_PLAYBACK_RATE = "playbackRate";
export const CLIP_PROP_SOURCE_DURATION_FRAMES = "sourceDurationFrames";
export const CLIP_PROP_TEXT = "text";
export const CLIP_PROP_PATH = "path";
export const CLIP_PROP_NAME = "name";
export const CLIP_PROP_DURATION_FRAMES = "durationFrames";

export type ClipNode = {
  properties: Map<string, unknown>;
};

export type SpaceNode = {
  space: number;
};

export type TrackItem = ClipNode | SpaceNode;

export type Track = {
  items: TrackItem[];
  properties: PropertyLayer;
};

export type VideoTrack = Track;

export type Project = {
  info: ProjectInfo;
  tracks: Track[];
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
    tracks: [createTrack()],
  };
}

export function createTrack(): Track {
  return {
    items: [],
    properties: createDefaultTrackProperties(),
  };
}

export function createVideoTrack(): Track {
  return createTrack();
}

export function clipObjectType(clip: ClipNode): ObjectType {
  const value = clip.properties.get(CLIP_PROP_OBJECT_TYPE);
  return isObjectType(value) ? value : "video";
}

export function clipIsMedia(clip: ClipNode): boolean {
  return isMediaObjectType(clipObjectType(clip));
}

export function clipIsDrawable(clip: ClipNode): boolean {
  return isDrawableObjectType(clipObjectType(clip));
}

export function clipPath(clip: ClipNode): string {
  const value = clip.properties.get(CLIP_PROP_PATH);
  return typeof value === "string" ? value : "";
}

export function clipTextContent(clip: ClipNode): string {
  const value = clip.properties.get(CLIP_PROP_TEXT);
  return typeof value === "string" ? value : DEFAULT_TEXT_CONTENT;
}

export function clipPlaybackRate(clip: ClipNode): number {
  if (!clipIsMedia(clip)) {
    return DEFAULT_PLAYBACK_RATE;
  }
  return normalizePlaybackRate(clip.properties.get(CLIP_PROP_PLAYBACK_RATE));
}

export function clipSourceDurationFrames(clip: ClipNode): number {
  if (!clipIsMedia(clip)) {
    return storedDurationFrames(clip);
  }
  const source = clip.properties.get(CLIP_PROP_SOURCE_DURATION_FRAMES);
  if (typeof source === "number" && Number.isFinite(source)) {
    return Math.max(0, Math.floor(source));
  }
  return storedDurationFrames(clip);
}

function storedDurationFrames(clip: ClipNode): number {
  const value = clip.properties.get(CLIP_PROP_DURATION_FRAMES);
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

export function clipDurationFrames(clip: ClipNode): number {
  if (clipIsMedia(clip)) {
    return timelineDurationFromSource(
      clipSourceDurationFrames(clip),
      clipPlaybackRate(clip),
    );
  }
  return storedDurationFrames(clip);
}

export function clipName(clip: ClipNode): string {
  const value = clip.properties.get(CLIP_PROP_NAME);
  return typeof value === "string" ? value : "clip";
}

export function createMediaClip(input: {
  objectType: "video" | "audio";
  path: string;
  name: string;
  sourceDurationFrames: number;
  playbackRate?: number;
}): ClipNode {
  const rate = normalizePlaybackRate(
    input.playbackRate ?? DEFAULT_PLAYBACK_RATE,
  );
  const source = Math.max(0, Math.floor(input.sourceDurationFrames));
  return {
    properties: new Map<string, unknown>([
      [CLIP_PROP_OBJECT_TYPE, input.objectType],
      [CLIP_PROP_PATH, input.path],
      [CLIP_PROP_NAME, input.name],
      [CLIP_PROP_SOURCE_DURATION_FRAMES, source],
      [CLIP_PROP_PLAYBACK_RATE, rate],
      [CLIP_PROP_DURATION_FRAMES, timelineDurationFromSource(source, rate)],
    ]),
  };
}

export function createTextClip(input?: {
  name?: string;
  text?: string;
  durationFrames?: number;
}): ClipNode {
  const duration = Math.max(
    1,
    Math.floor(input?.durationFrames ?? DEFAULT_TEXT_DURATION_FRAMES),
  );
  return {
    properties: new Map<string, unknown>([
      [CLIP_PROP_OBJECT_TYPE, "text"],
      [CLIP_PROP_NAME, input?.name ?? "Text"],
      [CLIP_PROP_TEXT, input?.text ?? DEFAULT_TEXT_CONTENT],
      [CLIP_PROP_DURATION_FRAMES, duration],
    ]),
  };
}

export function setClipPlaybackRate(clip: ClipNode, rate: number): void {
  if (!clipIsMedia(clip)) {
    return;
  }
  const nextRate = normalizePlaybackRate(rate);
  const source = clipSourceDurationFrames(clip);
  clip.properties.set(CLIP_PROP_PLAYBACK_RATE, nextRate);
  clip.properties.set(
    CLIP_PROP_DURATION_FRAMES,
    timelineDurationFromSource(source, nextRate),
  );
  if (!clip.properties.has(CLIP_PROP_SOURCE_DURATION_FRAMES)) {
    clip.properties.set(CLIP_PROP_SOURCE_DURATION_FRAMES, source);
  }
}

export function setClipTextContent(clip: ClipNode, text: string): void {
  if (clipObjectType(clip) !== "text") {
    return;
  }
  clip.properties.set(CLIP_PROP_TEXT, text);
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

export function cloneTrackProperties(track: Track): PropertyLayer {
  return clonePropertyLayer(track.properties);
}

export function restoreTrackProperties(
  track: Track,
  properties: PropertyLayer,
): void {
  track.properties = clonePropertyLayer(properties);
}
