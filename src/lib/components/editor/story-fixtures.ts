import { animatedChannelsForLayer } from "#lib/editor/keyframe-tracks.js";
import {
  channelAtOrDefault,
  createDefaultTrackProperties,
  createStaticChannel,
  enableChannelAnimation,
  type AnimatedChannel,
  type ChannelValueMap,
  type PropertyChannelId,
  type PropertyLayer,
  resolveProperties,
} from "#lib/editor/properties.js";
import {
  clipPropertyLayer,
  createMediaClip,
  createTextClip,
  createTrack,
  setClipPropertyLayer,
  type ClipNode,
  type Track,
} from "#lib/editor/types.js";
import type {
  PropertiesPanelHandlers,
  PropertiesPanelModel,
} from "./properties-panel.js";
import type { TimelineActions } from "./timeline-actions.js";

export function noopTimelineActions(
  overrides: Partial<TimelineActions> = {},
): TimelineActions {
  return {
    seekFromTimelineFrame: () => {},
    selectTrack: () => {},
    selectClip: () => {},
    beginClipDrag: () => {},
    moveClip: () => {},
    endClipDrag: () => {},
    dropVideoFile: async () => {},
    dropAudioFile: async () => {},
    insertTextObject: () => {},
    beginKeyframeDrag: () => {},
    movePropertyKeyframeAtIndex: () => {},
    endKeyframeDrag: () => {},
    ...overrides,
  };
}

export function noopPropertyHandlers(
  overrides: Partial<PropertiesPanelHandlers> = {},
): PropertiesPanelHandlers {
  return {
    setPropertyInterpolation: () => {},
    setPropertyAnimationEnabled: () => {},
    setPropertyValue: () => {},
    movePropertyKeyframe: () => {},
    setPlaybackRate: () => {},
    setTextContent: () => {},
    ...overrides,
  };
}

export function storyVideoClip(): ClipNode {
  const clip = createMediaClip({
    objectType: "video",
    path: "/stories/sample.mp4",
    name: "Intro.mp4",
    sourceDurationFrames: 120,
  });
  const layer: PropertyLayer = {
    opacity: enableChannelAnimation(createStaticChannel(1), 120, 1),
    x: enableChannelAnimation(createStaticChannel(0), 120, 0),
  };
  setClipPropertyLayer(clip, layer);
  return clip;
}

export function storyTextClip(): ClipNode {
  return createTextClip({
    name: "Title",
    text: "Hello Storybook",
    durationFrames: 90,
  });
}

export function storyTracks(): Track[] {
  const track = createTrack();
  track.items = [storyVideoClip(), { space: 20 }, storyTextClip()];
  return [track, createTrack()];
}

export function storyClipPanel(): {
  panel: PropertiesPanelModel;
  getChannel: (
    id: PropertyChannelId,
  ) => AnimatedChannel<ChannelValueMap[PropertyChannelId]> | null;
} {
  const trackProps = createDefaultTrackProperties();
  const clip = storyVideoClip();
  const objectLayer = clipPropertyLayer(clip);
  const frame = 30;
  const panel: PropertiesPanelModel = {
    kind: "clip",
    title: "Intro.mp4",
    subtitle: "/stories/sample.mp4",
    trackIndex: 0,
    itemIndex: 0,
    frame,
    resolved: resolveProperties(trackProps, objectLayer, frame),
    objectType: "video",
    media: true,
    drawable: true,
    playbackRate: 1,
    durationFrames: 120,
    text: "",
  };

  return {
    panel,
    getChannel: (id) => {
      if (objectLayer[id]) {
        return channelAtOrDefault(objectLayer, id);
      }
      return channelAtOrDefault(trackProps, id);
    },
  };
}

export function storyAnimatedLanes() {
  return animatedChannelsForLayer(clipPropertyLayer(storyVideoClip()));
}
