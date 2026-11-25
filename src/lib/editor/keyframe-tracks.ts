import {
  PROPERTY_CHANNEL_IDS,
  type AnimatedChannel,
  type ChannelValueMap,
  type PropertyChannelId,
  type PropertyLayer,
} from "./properties";

export const KEYFRAME_LANE_HEIGHT_REM = 1.15;
export const KEYFRAME_LANE_MIN_ROWS = 1;

export type KeyframeTrackLane = {
  id: PropertyChannelId;
  channel: AnimatedChannel<ChannelValueMap[PropertyChannelId]>;
  rowCount: number;
  heightRem: number;
};

export function animatedChannelsForLayer(
  layer: PropertyLayer | undefined,
): KeyframeTrackLane[] {
  if (!layer) {
    return [];
  }
  const lanes: KeyframeTrackLane[] = [];
  for (const id of PROPERTY_CHANNEL_IDS) {
    const channel = layer[id];
    if (!channel || channel.keyframes.length < 2) {
      continue;
    }
    const rowCount = Math.max(KEYFRAME_LANE_MIN_ROWS, channel.keyframes.length);
    lanes.push({
      id,
      channel: channel as AnimatedChannel<ChannelValueMap[PropertyChannelId]>,
      rowCount,
      heightRem: KEYFRAME_LANE_HEIGHT_REM,
    });
  }
  if (lanes.length === 0) {
    return lanes;
  }
  const densestRows = lanes.reduce(
    (max, lane) => Math.max(max, lane.rowCount),
    KEYFRAME_LANE_MIN_ROWS,
  );
  return lanes.map((lane) => ({
    ...lane,
    heightRem: densestRows * KEYFRAME_LANE_HEIGHT_REM,
  }));
}

export function objectKeyframeStackHeightRem(
  layer: PropertyLayer | undefined,
): number {
  const lanes = animatedChannelsForLayer(layer);
  return lanes.reduce((sum, lane) => sum + lane.heightRem, 0);
}

export const KEYFRAME_CHANNEL_LABELS: Record<PropertyChannelId, string> = {
  anchor: "Anchor",
  width: "W",
  height: "H",
  aspectRatioLock: "Lock",
  x: "X",
  y: "Y",
  opacity: "Op",
  rotation: "Rot",
};
