import type { MainAction } from "#lib/editor/MainAction.svelte.js";
import type { MainStore } from "#lib/editor/MainStore.svelte.js";
import type { PropertyChannelId } from "#lib/editor/properties.js";
import type { ClipNode, EditorSelection } from "#lib/editor/types.js";

export type TimelineActions = {
  seekFromTimelineFrame: (timelineFrame: number) => void;
  selectTrack: (trackIndex: number) => void;
  selectClip: (selection: { trackIndex: number; itemIndex: number }) => void;
  beginClipDrag: (trackIndex: number, itemIndex: number) => void;
  moveClip: (
    trackIndex: number,
    clip: ClipNode,
    nextStartFrame: number,
  ) => void;
  endClipDrag: () => void;
  dropVideoFile: (
    file: File,
    trackIndex: number,
    frame: number,
  ) => void | Promise<void>;
  dropAudioFile: (
    file: File,
    trackIndex: number,
    frame: number,
  ) => void | Promise<void>;
  insertTextObject: (trackIndex: number, frame: number) => void;
  beginKeyframeDrag: () => void;
  movePropertyKeyframeAtIndex: (
    channelId: PropertyChannelId,
    index: number,
    nextFrame: number,
  ) => void;
  endKeyframeDrag: () => void;
};

export function timelineActionsFromApp(
  store: MainStore,
  action: MainAction,
  seekFromTimelineFrame: (timelineFrame: number) => void,
): TimelineActions {
  return {
    seekFromTimelineFrame,
    selectTrack: (trackIndex) => action.selectTrack(trackIndex),
    selectClip: (selection) => action.selectClip(selection),
    beginClipDrag: (trackIndex, itemIndex) =>
      action.beginClipDrag(trackIndex, itemIndex),
    moveClip: (trackIndex, clip, nextStartFrame) => {
      const track = store.project.tracks[trackIndex];
      if (!track) {
        return;
      }
      const currentIndex = track.items.indexOf(clip);
      if (currentIndex < 0) {
        return;
      }
      action.moveClip(trackIndex, currentIndex, nextStartFrame);
    },
    endClipDrag: () => action.endClipDrag(),
    dropVideoFile: (file, trackIndex, frame) =>
      action.dropVideoFile(file, trackIndex, frame),
    dropAudioFile: (file, trackIndex, frame) =>
      action.dropAudioFile(file, trackIndex, frame),
    insertTextObject: (trackIndex, frame) =>
      action.insertTextObject(trackIndex, frame),
    beginKeyframeDrag: () => action.beginKeyframeDrag(),
    movePropertyKeyframeAtIndex: (channelId, index, nextFrame) =>
      action.movePropertyKeyframeAtIndex(channelId, index, nextFrame),
    endKeyframeDrag: () => action.endKeyframeDrag(),
  };
}

export type TimelineSelection = EditorSelection | null;
