import type { MainAction } from "#lib/editor/MainAction.svelte.js";
import type { MainStore } from "#lib/editor/MainStore.svelte.js";
import { playheadToTimelineFrames, projectFps } from "#lib/editor/fps.js";
import {
  channelAtOrDefault,
  type Anchor,
  type AnimatedChannel,
  type ChannelValueMap,
  type Interpolation,
  type PropertyChannelId,
  type ResolvedProperties,
  resolveProperties,
} from "#lib/editor/properties.js";
import { itemStartFrame, totalTrackFrames } from "#lib/editor/track-layout.js";
import {
  clipDurationFrames,
  clipIsDrawable,
  clipIsMedia,
  clipName,
  clipObjectType,
  clipPath,
  clipPlaybackRate,
  clipPropertyLayer,
  clipTextContent,
  isClipNode,
  type ObjectType,
} from "#lib/editor/types.js";

export type PropertiesPanelModel = {
  kind: "clip" | "track";
  title: string;
  subtitle: string;
  trackIndex: number;
  itemIndex: number | null;
  frame: number;
  resolved: ResolvedProperties;
  objectType: ObjectType | null;
  media: boolean;
  drawable: boolean;
  playbackRate: number;
  durationFrames: number;
  text: string;
};

export type PropertiesPanelHandlers = {
  setPropertyInterpolation: (
    id: PropertyChannelId,
    value: Interpolation,
  ) => void;
  setPropertyAnimationEnabled: (
    id: PropertyChannelId,
    enabled: boolean,
    durationFrames: number,
  ) => void;
  setPropertyValue: (
    id: PropertyChannelId,
    value: ChannelValueMap[PropertyChannelId],
    frame: number,
  ) => void;
  movePropertyKeyframe: (
    id: PropertyChannelId,
    fromFrame: number,
    toFrame: number,
  ) => void;
  setPlaybackRate: (rate: number) => void;
  setTextContent: (text: string) => void;
};

export function buildPropertiesPanel(
  store: MainStore,
): PropertiesPanelModel | null {
  const selection = store.selection;
  if (!selection) {
    return null;
  }
  const track = store.project.tracks[selection.trackIndex];
  if (!track) {
    return null;
  }
  const timelineFrame = playheadToTimelineFrames(
    store.playheadFrame,
    projectFps(store.project.info),
  );

  if (selection.type === "track") {
    return {
      kind: "track",
      title: `Track T${selection.trackIndex + 1}`,
      subtitle: "Track defaults",
      trackIndex: selection.trackIndex,
      itemIndex: null,
      frame: timelineFrame,
      resolved: resolveProperties(track.properties, undefined, timelineFrame),
      objectType: null,
      media: false,
      drawable: true,
      playbackRate: 1,
      durationFrames: Math.max(2, totalTrackFrames(track.items)),
      text: "",
    };
  }

  const item = track.items[selection.itemIndex];
  if (!item || !isClipNode(item)) {
    return null;
  }
  const start = itemStartFrame(track.items, selection.itemIndex);
  const localFrame = Math.max(0, timelineFrame - start);
  const objectType = clipObjectType(item);
  return {
    kind: "clip",
    title: clipName(item),
    subtitle: objectType === "text" ? clipTextContent(item) : clipPath(item),
    trackIndex: selection.trackIndex,
    itemIndex: selection.itemIndex,
    frame: localFrame,
    resolved: resolveProperties(
      track.properties,
      clipPropertyLayer(item),
      localFrame,
    ),
    objectType,
    media: clipIsMedia(item),
    drawable: clipIsDrawable(item),
    playbackRate: clipPlaybackRate(item),
    durationFrames: clipDurationFrames(item),
    text: clipTextContent(item),
  };
}

export function channelForPropertiesPanel(
  store: MainStore,
  id: PropertyChannelId,
): AnimatedChannel<ChannelValueMap[PropertyChannelId]> | null {
  const selection = store.selection;
  if (!selection) {
    return null;
  }
  const track = store.project.tracks[selection.trackIndex];
  if (!track) {
    return null;
  }
  if (selection.type === "track") {
    return channelAtOrDefault(track.properties, id);
  }
  const item = track.items[selection.itemIndex];
  if (!item || !isClipNode(item)) {
    return null;
  }
  const objectLayer = clipPropertyLayer(item);
  if (objectLayer[id]) {
    return channelAtOrDefault(objectLayer, id);
  }
  return channelAtOrDefault(track.properties, id);
}

export function propertiesPanelHandlersFromAction(
  action: MainAction,
): PropertiesPanelHandlers {
  return {
    setPropertyInterpolation: (id, value) =>
      action.setPropertyInterpolation(id, value),
    setPropertyAnimationEnabled: (id, enabled, durationFrames) =>
      action.setPropertyAnimationEnabled(id, enabled, durationFrames),
    setPropertyValue: (id, value, frame) =>
      action.setPropertyValue(id, value as never, frame),
    movePropertyKeyframe: (id, fromFrame, toFrame) =>
      action.movePropertyKeyframe(id, fromFrame, toFrame),
    setPlaybackRate: (rate) => action.setPlaybackRate(rate),
    setTextContent: (text) => action.setTextContent(text),
  };
}

export type { Anchor };
