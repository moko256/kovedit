export type ObjectType = "video" | "audio" | "text";

export const OBJECT_TYPES: readonly ObjectType[] = [
  "video",
  "audio",
  "text",
] as const;

export const DEFAULT_PLAYBACK_RATE = 1;
export const DEFAULT_TEXT_DURATION_FRAMES = 90;
export const DEFAULT_TEXT_CONTENT = "Text";

export function isObjectType(value: unknown): value is ObjectType {
  return value === "video" || value === "audio" || value === "text";
}

export function isMediaObjectType(type: ObjectType): boolean {
  return type === "video" || type === "audio";
}

export function isDrawableObjectType(type: ObjectType): boolean {
  return type === "video" || type === "text";
}

export function normalizePlaybackRate(rate: unknown): number {
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    return DEFAULT_PLAYBACK_RATE;
  }
  return rate;
}

export function timelineDurationFromSource(
  sourceDurationFrames: number,
  playbackRate: number,
): number {
  const source = Math.max(0, Math.floor(sourceDurationFrames));
  if (source === 0) {
    return 0;
  }
  const rate = normalizePlaybackRate(playbackRate);
  return Math.max(1, Math.round(source / rate));
}
