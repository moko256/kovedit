export type ProjectInfo = {
  fps?: number;
};

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
