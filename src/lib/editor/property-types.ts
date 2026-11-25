import {
  COMPOSITION_DEFAULT_CENTER_X,
  COMPOSITION_DEFAULT_CENTER_Y,
  COMPOSITION_HEIGHT,
  COMPOSITION_WIDTH,
} from "./composition";

export type Anchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type Interpolation = "linear" | "hold";

export type Keyframe<T> = {
  frame: number;
  value: T;
};

export type AnimatedChannel<T> = {
  keyframes: Keyframe<T>[];
  interpolation: Interpolation;
};

export type PropertyChannelId =
  | "anchor"
  | "width"
  | "height"
  | "aspectRatioLock"
  | "x"
  | "y"
  | "opacity"
  | "rotation";

export type ChannelValueMap = {
  anchor: Anchor;
  width: number;
  height: number;
  aspectRatioLock: boolean;
  x: number;
  y: number;
  opacity: number;
  rotation: number;
};

export type PropertyLayer = {
  [K in PropertyChannelId]?: AnimatedChannel<ChannelValueMap[K]>;
};

export type PropertySource = "track" | "object";

export type ResolvedChannel<T> = {
  value: T;
  source: PropertySource;
};

export type ResolvedProperties = {
  [K in PropertyChannelId]: ResolvedChannel<ChannelValueMap[K]>;
};

export const PROPERTY_CHANNEL_IDS: PropertyChannelId[] = [
  "anchor",
  "width",
  "height",
  "aspectRatioLock",
  "x",
  "y",
  "opacity",
  "rotation",
];

export const ANCHOR_OPTIONS: Anchor[] = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export const DEFAULT_VALUES: ChannelValueMap = {
  anchor: "middle-center",
  width: COMPOSITION_WIDTH,
  height: COMPOSITION_HEIGHT,
  aspectRatioLock: true,
  x: COMPOSITION_DEFAULT_CENTER_X,
  y: COMPOSITION_DEFAULT_CENTER_Y,
  opacity: 1,
  rotation: 0,
};

export function defaultChannelValue<K extends PropertyChannelId>(
  id: K,
): ChannelValueMap[K] {
  return DEFAULT_VALUES[id];
}
