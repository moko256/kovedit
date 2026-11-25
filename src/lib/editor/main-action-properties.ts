import { cloneTrackItems, type HistoryEntry } from "./history";
import type { MainStore } from "./MainStore.svelte";
import {
  applyValueToLayer,
  channelAtOrDefault,
  channelsEqual,
  clonePropertyLayer,
  disableChannelAnimation,
  enableChannelAnimation,
  evaluateChannel,
  isChannelAnimated,
  moveKeyframeAtIndex,
  propertyLayersEqual,
  setChannelInterpolation,
  writeChannel,
  type ChannelValueMap,
  type Interpolation,
  type PropertyChannelId,
  type PropertyLayer,
} from "./properties";
import { totalTrackFrames } from "./track-layout";
import {
  clipDurationFrames,
  clipIsDrawable,
  clipPropertyLayer,
  cloneClipProperties,
  cloneTrackProperties,
  isClipNode,
  setClipPropertyLayer,
  type ClipSelection,
  type TrackSelection,
} from "./types";

export type PropertyMutationHost = {
  store: MainStore;
  isKeyframeDragPending: () => boolean;
  pushHistory: (entry: HistoryEntry) => void;
};

export function setTrackPropertyValue<K extends PropertyChannelId>(
  host: PropertyMutationHost,
  selection: TrackSelection,
  id: K,
  value: ChannelValueMap[K],
  frame: number,
): void {
  const project = host.store.project;
  const track = project.tracks[selection.trackIndex];
  if (!track) {
    return;
  }
  const trackPropertiesBefore = cloneTrackProperties(track);
  const layer = clonePropertyLayer(track.properties);
  applyValueToLayer(layer, layer, id, value, frame);
  if (propertyLayersEqual(layer, track.properties)) {
    return;
  }
  const tracks = [...project.tracks];
  tracks[selection.trackIndex] = {
    items: track.items,
    properties: layer,
  };
  host.store.project = { ...project, tracks };
  host.pushHistory({
    identity: {
      trackIndex: selection.trackIndex,
      itemIndex: -1,
      clip: null,
    },
    before: cloneTrackItems(track.items),
    after: cloneTrackItems(track.items),
    trackPropertiesBefore,
    trackPropertiesAfter: clonePropertyLayer(layer),
  });
}

export function setObjectPropertyValue<K extends PropertyChannelId>(
  host: PropertyMutationHost,
  selection: ClipSelection,
  id: K,
  value: ChannelValueMap[K],
  frame: number,
): void {
  const project = host.store.project;
  const track = project.tracks[selection.trackIndex];
  if (!track) {
    return;
  }
  const item = track.items[selection.itemIndex];
  if (!item || !isClipNode(item) || !clipIsDrawable(item)) {
    return;
  }
  const before = cloneTrackItems(track.items);
  const clipPropertiesBefore = cloneClipProperties(item);
  const objectLayer = clipPropertyLayer(item);
  const nextLayer = clonePropertyLayer(objectLayer);
  applyValueToLayer(nextLayer, track.properties, id, value, frame);
  if (propertyLayersEqual(nextLayer, objectLayer)) {
    return;
  }
  setClipPropertyLayer(item, nextLayer);
  const tracks = [...project.tracks];
  tracks[selection.trackIndex] = {
    items: [...track.items],
    properties: clonePropertyLayer(track.properties),
  };
  host.store.project = { ...project, tracks };
  host.pushHistory({
    identity: {
      trackIndex: selection.trackIndex,
      itemIndex: selection.itemIndex,
      clip: item,
    },
    before,
    after: cloneTrackItems(tracks[selection.trackIndex].items),
    clipPropertiesBefore,
    clipPropertiesAfter: cloneClipProperties(item),
  });
}

export function setTrackPropertyInterpolation(
  host: PropertyMutationHost,
  selection: TrackSelection,
  id: PropertyChannelId,
  interpolation: Interpolation,
): void {
  const project = host.store.project;
  const track = project.tracks[selection.trackIndex];
  if (!track) {
    return;
  }
  const current = channelAtOrDefault(track.properties, id);
  if (current.interpolation === interpolation) {
    return;
  }
  const trackPropertiesBefore = cloneTrackProperties(track);
  const layer = clonePropertyLayer(track.properties);
  writeChannel(layer, id, setChannelInterpolation(current, interpolation));
  const tracks = [...project.tracks];
  tracks[selection.trackIndex] = {
    items: track.items,
    properties: layer,
  };
  host.store.project = { ...project, tracks };
  host.pushHistory({
    identity: {
      trackIndex: selection.trackIndex,
      itemIndex: -1,
      clip: null,
    },
    before: cloneTrackItems(track.items),
    after: cloneTrackItems(track.items),
    trackPropertiesBefore,
    trackPropertiesAfter: clonePropertyLayer(layer),
  });
}

export function setObjectPropertyInterpolation(
  host: PropertyMutationHost,
  selection: ClipSelection,
  id: PropertyChannelId,
  interpolation: Interpolation,
): void {
  const project = host.store.project;
  const track = project.tracks[selection.trackIndex];
  if (!track) {
    return;
  }
  const item = track.items[selection.itemIndex];
  if (!item || !isClipNode(item) || !clipIsDrawable(item)) {
    return;
  }
  const objectLayer = clipPropertyLayer(item);
  const base = objectLayer[id]
    ? channelAtOrDefault(objectLayer, id)
    : channelAtOrDefault(track.properties, id);
  if (objectLayer[id] && base.interpolation === interpolation) {
    return;
  }
  const before = cloneTrackItems(track.items);
  const clipPropertiesBefore = cloneClipProperties(item);
  const nextLayer = clonePropertyLayer(objectLayer);
  writeChannel(nextLayer, id, setChannelInterpolation(base, interpolation));
  setClipPropertyLayer(item, nextLayer);
  const tracks = [...project.tracks];
  tracks[selection.trackIndex] = {
    items: [...track.items],
    properties: clonePropertyLayer(track.properties),
  };
  host.store.project = { ...project, tracks };
  host.pushHistory({
    identity: {
      trackIndex: selection.trackIndex,
      itemIndex: selection.itemIndex,
      clip: item,
    },
    before,
    after: cloneTrackItems(tracks[selection.trackIndex].items),
    clipPropertiesBefore,
    clipPropertiesAfter: cloneClipProperties(item),
  });
}

function toggleChannelAnimation<K extends PropertyChannelId>(
  channel: ReturnType<typeof channelAtOrDefault<K>>,
  id: K,
  enabled: boolean,
  durationFrames: number,
  target: PropertyLayer,
  trackFallback: PropertyLayer,
): ReturnType<typeof channelAtOrDefault<K>> | null {
  if (enabled) {
    if (isChannelAnimated(channel)) {
      return null;
    }
    const value = evaluateChannel(target[id] ?? trackFallback[id], id, 0);
    return enableChannelAnimation(channel, durationFrames, value) as ReturnType<
      typeof channelAtOrDefault<K>
    >;
  }
  if (!isChannelAnimated(channel)) {
    return null;
  }
  return disableChannelAnimation(channel) as ReturnType<
    typeof channelAtOrDefault<K>
  >;
}

export function setTrackPropertyAnimationEnabled(
  host: PropertyMutationHost,
  selection: TrackSelection,
  id: PropertyChannelId,
  enabled: boolean,
  durationFrames?: number,
): void {
  const project = host.store.project;
  const track = project.tracks[selection.trackIndex];
  if (!track) {
    return;
  }
  const current = channelAtOrDefault(track.properties, id);
  const duration = durationFrames ?? Math.max(2, totalTrackFrames(track.items));
  const next = toggleChannelAnimation(
    current,
    id,
    enabled,
    duration,
    track.properties,
    track.properties,
  );
  if (!next) {
    return;
  }
  const trackPropertiesBefore = cloneTrackProperties(track);
  const layer = clonePropertyLayer(track.properties);
  writeChannel(layer, id, next);
  const tracks = [...project.tracks];
  tracks[selection.trackIndex] = {
    items: track.items,
    properties: layer,
  };
  host.store.project = { ...project, tracks };
  host.pushHistory({
    identity: {
      trackIndex: selection.trackIndex,
      itemIndex: -1,
      clip: null,
    },
    before: cloneTrackItems(track.items),
    after: cloneTrackItems(track.items),
    trackPropertiesBefore,
    trackPropertiesAfter: clonePropertyLayer(layer),
  });
}

export function setObjectPropertyAnimationEnabled(
  host: PropertyMutationHost,
  selection: ClipSelection,
  id: PropertyChannelId,
  enabled: boolean,
  durationFrames?: number,
): void {
  const project = host.store.project;
  const track = project.tracks[selection.trackIndex];
  if (!track) {
    return;
  }
  const item = track.items[selection.itemIndex];
  if (!item || !isClipNode(item) || !clipIsDrawable(item)) {
    return;
  }
  const objectLayer = clipPropertyLayer(item);
  const base = objectLayer[id]
    ? channelAtOrDefault(objectLayer, id)
    : channelAtOrDefault(track.properties, id);
  const duration = durationFrames ?? Math.max(2, clipDurationFrames(item));
  const next = toggleChannelAnimation(
    base,
    id,
    enabled,
    duration,
    objectLayer,
    track.properties,
  );
  if (!next) {
    return;
  }
  const before = cloneTrackItems(track.items);
  const clipPropertiesBefore = cloneClipProperties(item);
  const nextLayer = clonePropertyLayer(objectLayer);
  writeChannel(nextLayer, id, next);
  setClipPropertyLayer(item, nextLayer);
  const tracks = [...project.tracks];
  tracks[selection.trackIndex] = {
    items: [...track.items],
    properties: clonePropertyLayer(track.properties),
  };
  host.store.project = { ...project, tracks };
  host.pushHistory({
    identity: {
      trackIndex: selection.trackIndex,
      itemIndex: selection.itemIndex,
      clip: item,
    },
    before,
    after: cloneTrackItems(tracks[selection.trackIndex].items),
    clipPropertiesBefore,
    clipPropertiesAfter: cloneClipProperties(item),
  });
}

export function moveTrackPropertyKeyframe(
  host: PropertyMutationHost,
  selection: TrackSelection,
  id: PropertyChannelId,
  fromFrame: number,
  toFrame: number,
): void {
  const current = channelAtOrDefault(
    host.store.project.tracks[selection.trackIndex]?.properties ?? {},
    id,
  );
  const index = current.keyframes.findIndex(
    (keyframe) => keyframe.frame === Math.floor(fromFrame),
  );
  moveTrackPropertyKeyframeAtIndex(host, selection, id, index, toFrame);
}

export function moveTrackPropertyKeyframeAtIndex(
  host: PropertyMutationHost,
  selection: TrackSelection,
  id: PropertyChannelId,
  index: number,
  toFrame: number,
): void {
  const project = host.store.project;
  const track = project.tracks[selection.trackIndex];
  if (!track) {
    return;
  }
  const current = channelAtOrDefault(track.properties, id);
  if (!isChannelAnimated(current)) {
    return;
  }
  const moved = moveKeyframeAtIndex(current, index, toFrame);
  if (channelsEqual(moved, current)) {
    return;
  }
  const trackPropertiesBefore = cloneTrackProperties(track);
  const layer = clonePropertyLayer(track.properties);
  writeChannel(layer, id, moved);
  const tracks = [...project.tracks];
  tracks[selection.trackIndex] = {
    items: track.items,
    properties: layer,
  };
  host.store.project = { ...project, tracks };
  if (host.isKeyframeDragPending()) {
    return;
  }
  host.pushHistory({
    identity: {
      trackIndex: selection.trackIndex,
      itemIndex: -1,
      clip: null,
    },
    before: cloneTrackItems(track.items),
    after: cloneTrackItems(track.items),
    trackPropertiesBefore,
    trackPropertiesAfter: clonePropertyLayer(layer),
  });
}

export function moveObjectPropertyKeyframe(
  host: PropertyMutationHost,
  selection: ClipSelection,
  id: PropertyChannelId,
  fromFrame: number,
  toFrame: number,
): void {
  const track = host.store.project.tracks[selection.trackIndex];
  const item = track?.items[selection.itemIndex];
  if (!item || !isClipNode(item)) {
    return;
  }
  const current = clipPropertyLayer(item)[id]
    ? channelAtOrDefault(clipPropertyLayer(item), id)
    : null;
  if (!current) {
    return;
  }
  const index = current.keyframes.findIndex(
    (keyframe) => keyframe.frame === Math.floor(fromFrame),
  );
  moveObjectPropertyKeyframeAtIndex(host, selection, id, index, toFrame);
}

export function moveObjectPropertyKeyframeAtIndex(
  host: PropertyMutationHost,
  selection: ClipSelection,
  id: PropertyChannelId,
  index: number,
  toFrame: number,
): void {
  const project = host.store.project;
  const track = project.tracks[selection.trackIndex];
  if (!track) {
    return;
  }
  const item = track.items[selection.itemIndex];
  if (!item || !isClipNode(item) || !clipIsDrawable(item)) {
    return;
  }
  const objectLayer = clipPropertyLayer(item);
  const current = objectLayer[id] ? channelAtOrDefault(objectLayer, id) : null;
  if (!current || !isChannelAnimated(current)) {
    return;
  }
  const moved = moveKeyframeAtIndex(current, index, toFrame);
  if (channelsEqual(moved, current)) {
    return;
  }
  const before = cloneTrackItems(track.items);
  const clipPropertiesBefore = cloneClipProperties(item);
  const nextLayer = clonePropertyLayer(objectLayer);
  writeChannel(nextLayer, id, moved);
  setClipPropertyLayer(item, nextLayer);
  const tracks = [...project.tracks];
  tracks[selection.trackIndex] = {
    items: [...track.items],
    properties: clonePropertyLayer(track.properties),
  };
  host.store.project = { ...project, tracks };
  if (host.isKeyframeDragPending()) {
    return;
  }
  host.pushHistory({
    identity: {
      trackIndex: selection.trackIndex,
      itemIndex: selection.itemIndex,
      clip: item,
    },
    before,
    after: cloneTrackItems(tracks[selection.trackIndex].items),
    clipPropertiesBefore,
    clipPropertiesAfter: cloneClipProperties(item),
  });
}
