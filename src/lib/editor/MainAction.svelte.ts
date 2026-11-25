import { PLAYHEAD_FPS, projectFps, timelineFramesToPlayhead } from "./fps";
import {
  cloneTrackItems,
  pushUndoEntry,
  trackItemsEqual,
  type HistoryEntry,
} from "./history";
import { durationFramesForFile } from "./media";
import type { MainStore } from "./MainStore.svelte";
import { maxPlayheadFrames } from "./playhead";
import {
  aspectRatio,
  channelAtOrDefault,
  clonePropertyLayer,
  disableChannelAnimation,
  enableChannelAnimation,
  evaluateChannel,
  isChannelAnimated,
  moveKeyframeAtIndex,
  moveKeyframeFrame,
  proportionalHeight,
  proportionalWidth,
  setChannelInterpolation,
  upsertKeyframe,
  writeChannel,
  type ChannelValueMap,
  type Interpolation,
  type PropertyChannelId,
  type PropertyLayer,
} from "./properties";
import {
  insertClipAtFrame,
  itemStartFrame,
  moveClipToFrame,
  totalTrackFrames,
} from "./track-layout";
import {
  clipDurationFrames,
  clipIsDrawable,
  clipPlaybackRate,
  clipPropertyLayer,
  clipTextContent,
  cloneClipProperties,
  cloneTrackProperties,
  createMediaClip,
  createTextClip,
  createTrack,
  isClipNode,
  restoreClipProperties,
  restoreTrackProperties,
  setClipPlaybackRate,
  setClipPropertyLayer,
  setClipTextContent,
  type ClipNode,
  type ClipSelection,
  type EditorSelection,
  type Track,
  type TrackItem,
  type TrackSelection,
} from "./types";

type PendingClipDrag = {
  trackIndex: number;
  clip: ClipNode;
  before: TrackItem[];
};

type PendingKeyframeDrag = {
  selection: EditorSelection;
  clip: ClipNode | null;
  clipPropertiesBefore: Map<string, unknown> | undefined;
  trackPropertiesBefore: PropertyLayer | undefined;
  itemsBefore: TrackItem[];
};

export class MainAction {
  #store: MainStore;
  #timer: ReturnType<typeof setInterval> | null = null;
  #playOriginMs = 0;
  #playOriginFrame = 0;
  #pendingClipDrag: PendingClipDrag | null = null;
  #pendingKeyframeDrag: PendingKeyframeDrag | null = null;

  constructor(store: MainStore) {
    this.#store = store;
  }

  selectClip = (selection: Omit<ClipSelection, "type"> | null): void => {
    if (!selection) {
      this.#store.selection = null;
      return;
    }
    this.#store.selection = { type: "clip", ...selection };
  };

  selectTrack = (trackIndex: number): void => {
    this.#store.selection = { type: "track", trackIndex };
  };

  ensureTrack = (): void => {
    if (this.#store.project.tracks.length > 0) {
      return;
    }
    this.#store.project = {
      ...this.#store.project,
      tracks: [createTrack()],
    };
  };

  ensureVideoTrack = (): void => {
    this.ensureTrack();
  };

  dropVideoFile = async (
    file: File,
    trackIndex: number,
    frame: number,
  ): Promise<void> => {
    await this.dropMediaFile(file, "video", trackIndex, frame);
  };

  dropAudioFile = async (
    file: File,
    trackIndex: number,
    frame: number,
  ): Promise<void> => {
    await this.dropMediaFile(file, "audio", trackIndex, frame);
  };

  dropMediaFile = async (
    file: File,
    objectType: "video" | "audio",
    trackIndex: number,
    frame: number,
  ): Promise<void> => {
    this.ensureTrack();
    const project = this.#store.project;
    const tracks = [...project.tracks];
    let index = trackIndex;
    if (index < 0 || index >= tracks.length) {
      index = 0;
    }
    const track = tracks[index];
    if (!track) {
      return;
    }

    const sourceDurationFrames = await durationFramesForFile(
      file,
      project.info,
    );
    const path = URL.createObjectURL(file);
    const clip = createMediaClip({
      objectType,
      path,
      name: file.name,
      sourceDurationFrames,
    });

    this.#commitInsertedClip(tracks, index, track, clip, frame);
  };

  insertTextObject = (trackIndex: number, frame: number): void => {
    this.ensureTrack();
    const project = this.#store.project;
    const tracks = [...project.tracks];
    let index = trackIndex;
    if (index < 0 || index >= tracks.length) {
      index = 0;
    }
    const track = tracks[index];
    if (!track) {
      return;
    }
    const clip = createTextClip();
    this.#commitInsertedClip(tracks, index, track, clip, frame);
  };

  beginClipDrag = (trackIndex: number, itemIndex: number): void => {
    const project = this.#store.project;
    if (trackIndex < 0 || trackIndex >= project.tracks.length) {
      return;
    }
    const track = project.tracks[trackIndex];
    if (!track) {
      return;
    }
    if (itemIndex < 0 || itemIndex >= track.items.length) {
      return;
    }
    const clip = track.items[itemIndex];
    if (!isClipNode(clip)) {
      return;
    }
    this.#pendingClipDrag = {
      trackIndex,
      clip,
      before: cloneTrackItems(track.items),
    };
  };

  moveClip = (
    trackIndex: number,
    itemIndex: number,
    newStartFrame: number,
  ): void => {
    const project = this.#store.project;
    if (trackIndex < 0 || trackIndex >= project.tracks.length) {
      return;
    }
    const track = project.tracks[trackIndex];
    if (!track) {
      return;
    }
    if (itemIndex < 0 || itemIndex >= track.items.length) {
      return;
    }

    const clip = track.items[itemIndex];
    const items = moveClipToFrame(
      track.items,
      itemIndex,
      Math.max(0, newStartFrame),
    );
    if (items === track.items) {
      return;
    }
    const tracks = [...project.tracks];
    tracks[trackIndex] = {
      items,
      properties: clonePropertyLayer(track.properties),
    };
    this.#store.project = { ...project, tracks };

    const nextIndex = items.indexOf(clip);
    if (nextIndex >= 0) {
      this.#store.selection = {
        type: "clip",
        trackIndex,
        itemIndex: nextIndex,
      };
    }
  };

  endClipDrag = (): void => {
    const pending = this.#pendingClipDrag;
    this.#pendingClipDrag = null;
    if (!pending) {
      return;
    }
    const project = this.#store.project;
    const track = project.tracks[pending.trackIndex];
    if (!track) {
      return;
    }
    const after = cloneTrackItems(track.items);
    if (trackItemsEqual(pending.before, after)) {
      return;
    }
    const itemIndex = after.indexOf(pending.clip);
    if (itemIndex < 0) {
      return;
    }
    this.#pushHistory({
      identity: {
        trackIndex: pending.trackIndex,
        itemIndex,
        clip: pending.clip,
      },
      before: pending.before,
      after,
    });
  };

  setPlaybackRate = (rate: number): void => {
    if (this.#pendingClipDrag) {
      return;
    }
    const selection = this.#store.selection;
    if (!selection || selection.type !== "clip") {
      return;
    }
    const project = this.#store.project;
    const track = project.tracks[selection.trackIndex];
    if (!track) {
      return;
    }
    const item = track.items[selection.itemIndex];
    if (!item || !isClipNode(item)) {
      return;
    }
    const beforeRate = clipPlaybackRate(item);
    const beforeDuration = clipDurationFrames(item);
    const before = cloneTrackItems(track.items);
    const clipPropertiesBefore = cloneClipProperties(item);
    setClipPlaybackRate(item, rate);
    if (
      clipPlaybackRate(item) === beforeRate &&
      clipDurationFrames(item) === beforeDuration
    ) {
      return;
    }
    const tracks = [...project.tracks];
    tracks[selection.trackIndex] = {
      items: [...track.items],
      properties: clonePropertyLayer(track.properties),
    };
    this.#store.project = { ...project, tracks };
    this.#pushHistory({
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
    const max = maxPlayheadFrames(this.#store.project);
    if (this.#store.playheadFrame > max) {
      this.#store.playheadFrame = max;
    }
  };

  setTextContent = (text: string): void => {
    if (this.#pendingClipDrag) {
      return;
    }
    const selection = this.#store.selection;
    if (!selection || selection.type !== "clip") {
      return;
    }
    const project = this.#store.project;
    const track = project.tracks[selection.trackIndex];
    if (!track) {
      return;
    }
    const item = track.items[selection.itemIndex];
    if (!item || !isClipNode(item)) {
      return;
    }
    const beforeText = clipTextContent(item);
    const before = cloneTrackItems(track.items);
    const clipPropertiesBefore = cloneClipProperties(item);
    setClipTextContent(item, text);
    if (clipTextContent(item) === beforeText) {
      return;
    }
    const tracks = [...project.tracks];
    tracks[selection.trackIndex] = {
      items: [...track.items],
      properties: clonePropertyLayer(track.properties),
    };
    this.#store.project = { ...project, tracks };
    this.#pushHistory({
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
  };

  setPropertyValue = <K extends PropertyChannelId>(
    id: K,
    value: ChannelValueMap[K],
    frame: number,
  ): void => {
    if (this.#pendingClipDrag) {
      return;
    }
    const selection = this.#store.selection;
    if (!selection) {
      return;
    }
    if (selection.type === "track") {
      this.#setTrackPropertyValue(selection, id, value, frame);
      return;
    }
    this.#setObjectPropertyValue(selection, id, value, frame);
  };

  setPropertyInterpolation = (
    id: PropertyChannelId,
    interpolation: Interpolation,
  ): void => {
    if (this.#pendingClipDrag) {
      return;
    }
    const selection = this.#store.selection;
    if (!selection) {
      return;
    }
    if (selection.type === "track") {
      this.#setTrackPropertyInterpolation(selection, id, interpolation);
      return;
    }
    this.#setObjectPropertyInterpolation(selection, id, interpolation);
  };

  setPropertyAnimationEnabled = (
    id: PropertyChannelId,
    enabled: boolean,
    durationFrames?: number,
  ): void => {
    if (this.#pendingClipDrag) {
      return;
    }
    const selection = this.#store.selection;
    if (!selection) {
      return;
    }
    if (selection.type === "track") {
      this.#setTrackPropertyAnimationEnabled(
        selection,
        id,
        enabled,
        durationFrames,
      );
      return;
    }
    this.#setObjectPropertyAnimationEnabled(
      selection,
      id,
      enabled,
      durationFrames,
    );
  };

  movePropertyKeyframe = (
    id: PropertyChannelId,
    fromFrame: number,
    toFrame: number,
  ): void => {
    if (this.#pendingClipDrag) {
      return;
    }
    const selection = this.#store.selection;
    if (!selection) {
      return;
    }
    if (selection.type === "track") {
      this.#moveTrackPropertyKeyframe(selection, id, fromFrame, toFrame);
      return;
    }
    this.#moveObjectPropertyKeyframe(selection, id, fromFrame, toFrame);
  };

  movePropertyKeyframeAtIndex = (
    id: PropertyChannelId,
    index: number,
    toFrame: number,
  ): void => {
    if (this.#pendingClipDrag) {
      return;
    }
    const selection = this.#store.selection;
    if (!selection) {
      return;
    }
    if (selection.type === "track") {
      this.#moveTrackPropertyKeyframeAtIndex(selection, id, index, toFrame);
      return;
    }
    this.#moveObjectPropertyKeyframeAtIndex(selection, id, index, toFrame);
  };

  beginKeyframeDrag = (): void => {
    if (this.#pendingClipDrag || this.#pendingKeyframeDrag) {
      return;
    }
    const selection = this.#store.selection;
    if (!selection) {
      return;
    }
    const track = this.#store.project.tracks[selection.trackIndex];
    if (!track) {
      return;
    }
    if (selection.type === "track") {
      this.#pendingKeyframeDrag = {
        selection,
        clip: null,
        clipPropertiesBefore: undefined,
        trackPropertiesBefore: cloneTrackProperties(track),
        itemsBefore: cloneTrackItems(track.items),
      };
      return;
    }
    const item = track.items[selection.itemIndex];
    if (!item || !isClipNode(item)) {
      return;
    }
    this.#pendingKeyframeDrag = {
      selection,
      clip: item,
      clipPropertiesBefore: cloneClipProperties(item),
      trackPropertiesBefore: undefined,
      itemsBefore: cloneTrackItems(track.items),
    };
  };

  endKeyframeDrag = (): void => {
    const pending = this.#pendingKeyframeDrag;
    this.#pendingKeyframeDrag = null;
    if (!pending) {
      return;
    }
    const project = this.#store.project;
    const track = project.tracks[pending.selection.trackIndex];
    if (!track) {
      return;
    }
    if (pending.selection.type === "track") {
      if (
        pending.trackPropertiesBefore &&
        propertyLayersEqual(pending.trackPropertiesBefore, track.properties)
      ) {
        return;
      }
      this.#pushHistory({
        identity: {
          trackIndex: pending.selection.trackIndex,
          itemIndex: -1,
          clip: null,
        },
        before: pending.itemsBefore,
        after: cloneTrackItems(track.items),
        trackPropertiesBefore: pending.trackPropertiesBefore,
        trackPropertiesAfter: clonePropertyLayer(track.properties),
      });
      return;
    }
    if (!pending.clip || !pending.clipPropertiesBefore) {
      return;
    }
    const afterProps = cloneClipProperties(pending.clip);
    if (
      JSON.stringify([...pending.clipPropertiesBefore.entries()]) ===
      JSON.stringify([...afterProps.entries()])
    ) {
      return;
    }
    const itemIndex = track.items.indexOf(pending.clip);
    this.#pushHistory({
      identity: {
        trackIndex: pending.selection.trackIndex,
        itemIndex,
        clip: pending.clip,
      },
      before: pending.itemsBefore,
      after: cloneTrackItems(track.items),
      clipPropertiesBefore: pending.clipPropertiesBefore,
      clipPropertiesAfter: afterProps,
    });
  };

  undo = (): void => {
    if (this.#pendingClipDrag) {
      return;
    }
    const stack = this.#store.undoStack;
    if (stack.length === 0) {
      return;
    }
    const entry = stack[stack.length - 1];
    this.#store.undoStack = stack.slice(0, -1);
    this.#store.redoStack = [...this.#store.redoStack, entry];
    this.#applyHistoryItems(
      entry.identity.trackIndex,
      entry.before,
      entry,
      entry.clipPropertiesBefore,
      entry.trackPropertiesBefore,
    );
  };

  redo = (): void => {
    if (this.#pendingClipDrag) {
      return;
    }
    const stack = this.#store.redoStack;
    if (stack.length === 0) {
      return;
    }
    const entry = stack[stack.length - 1];
    this.#store.redoStack = stack.slice(0, -1);
    this.#store.undoStack = pushUndoEntry(this.#store.undoStack, entry);
    this.#applyHistoryItems(
      entry.identity.trackIndex,
      entry.after,
      entry,
      entry.clipPropertiesAfter,
      entry.trackPropertiesAfter,
    );
  };

  seek = (playheadFrame: number): void => {
    const max = maxPlayheadFrames(this.#store.project);
    const next = Math.max(0, Math.floor(playheadFrame));
    this.#store.playheadFrame = max > 0 ? Math.min(next, max) : 0;
    if (this.#store.playing) {
      this.#playOriginMs = performance.now();
      this.#playOriginFrame = this.#store.playheadFrame;
      this.#store.transportEpoch += 1;
    }
  };

  nudgePlayhead = (deltaFrames: number): void => {
    this.seek(this.#store.playheadFrame + deltaFrames);
  };

  play = (): void => {
    const max = maxPlayheadFrames(this.#store.project);
    if (max <= 0) {
      return;
    }
    if (this.#store.playheadFrame >= max) {
      this.#store.playheadFrame = 0;
    }
    this.#store.playing = true;
    this.#store.transportEpoch += 1;
    this.#startTimer();
  };

  stop = (): void => {
    this.#store.playing = false;
    this.#clearTimer();
  };

  togglePlay = (): void => {
    if (this.#store.playing) {
      this.stop();
      return;
    }
    this.play();
  };

  #commitInsertedClip = (
    tracks: Track[],
    index: number,
    track: Track,
    clip: ClipNode,
    frame: number,
  ): void => {
    const items = insertClipAtFrame(track.items, clip, frame);
    if (items === null) {
      return;
    }
    const project = this.#store.project;
    tracks[index] = {
      items,
      properties: clonePropertyLayer(track.properties),
    };
    this.#store.project = { ...project, tracks };

    const itemIndex = items.indexOf(clip);
    if (itemIndex >= 0) {
      this.#store.selection = { type: "clip", trackIndex: index, itemIndex };
      const startFrame = itemStartFrame(items, itemIndex);
      this.#store.playheadFrame = timelineFramesToPlayhead(
        startFrame,
        projectFps(project.info),
      );
    }
  };

  #setTrackPropertyValue = <K extends PropertyChannelId>(
    selection: TrackSelection,
    id: K,
    value: ChannelValueMap[K],
    frame: number,
  ): void => {
    const project = this.#store.project;
    const track = project.tracks[selection.trackIndex];
    if (!track) {
      return;
    }
    const trackPropertiesBefore = cloneTrackProperties(track);
    const layer = clonePropertyLayer(track.properties);
    this.#applyValueToLayer(layer, layer, id, value, frame);
    if (propertyLayersEqual(layer, track.properties)) {
      return;
    }
    const tracks = [...project.tracks];
    tracks[selection.trackIndex] = {
      items: track.items,
      properties: layer,
    };
    this.#store.project = { ...project, tracks };
    this.#pushHistory({
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
  };

  #setObjectPropertyValue = <K extends PropertyChannelId>(
    selection: ClipSelection,
    id: K,
    value: ChannelValueMap[K],
    frame: number,
  ): void => {
    const project = this.#store.project;
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
    this.#applyValueToLayer(nextLayer, track.properties, id, value, frame);
    if (propertyLayersEqual(nextLayer, objectLayer)) {
      return;
    }
    setClipPropertyLayer(item, nextLayer);
    const tracks = [...project.tracks];
    tracks[selection.trackIndex] = {
      items: [...track.items],
      properties: clonePropertyLayer(track.properties),
    };
    this.#store.project = { ...project, tracks };
    this.#pushHistory({
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
  };

  #setTrackPropertyInterpolation = (
    selection: TrackSelection,
    id: PropertyChannelId,
    interpolation: Interpolation,
  ): void => {
    const project = this.#store.project;
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
    this.#store.project = { ...project, tracks };
    this.#pushHistory({
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
  };

  #setObjectPropertyInterpolation = (
    selection: ClipSelection,
    id: PropertyChannelId,
    interpolation: Interpolation,
  ): void => {
    const project = this.#store.project;
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
    this.#store.project = { ...project, tracks };
    this.#pushHistory({
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
  };

  #setTrackPropertyAnimationEnabled = (
    selection: TrackSelection,
    id: PropertyChannelId,
    enabled: boolean,
    durationFrames?: number,
  ): void => {
    const project = this.#store.project;
    const track = project.tracks[selection.trackIndex];
    if (!track) {
      return;
    }
    const current = channelAtOrDefault(track.properties, id);
    const duration =
      durationFrames ?? Math.max(2, totalTrackFrames(track.items));
    const next = this.#toggleChannelAnimation(
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
    this.#store.project = { ...project, tracks };
    this.#pushHistory({
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
  };

  #setObjectPropertyAnimationEnabled = (
    selection: ClipSelection,
    id: PropertyChannelId,
    enabled: boolean,
    durationFrames?: number,
  ): void => {
    const project = this.#store.project;
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
    const next = this.#toggleChannelAnimation(
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
    this.#store.project = { ...project, tracks };
    this.#pushHistory({
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
  };

  #toggleChannelAnimation = <K extends PropertyChannelId>(
    channel: ReturnType<typeof channelAtOrDefault<K>>,
    id: K,
    enabled: boolean,
    durationFrames: number,
    target: PropertyLayer,
    trackFallback: PropertyLayer,
  ): ReturnType<typeof channelAtOrDefault<K>> | null => {
    if (enabled) {
      if (isChannelAnimated(channel)) {
        return null;
      }
      const value = evaluateChannel(target[id] ?? trackFallback[id], id, 0);
      return enableChannelAnimation(
        channel,
        durationFrames,
        value,
      ) as ReturnType<typeof channelAtOrDefault<K>>;
    }
    if (!isChannelAnimated(channel)) {
      return null;
    }
    return disableChannelAnimation(channel) as ReturnType<
      typeof channelAtOrDefault<K>
    >;
  };

  #moveTrackPropertyKeyframe = (
    selection: TrackSelection,
    id: PropertyChannelId,
    fromFrame: number,
    toFrame: number,
  ): void => {
    const current = channelAtOrDefault(
      this.#store.project.tracks[selection.trackIndex]?.properties ?? {},
      id,
    );
    const index = current.keyframes.findIndex(
      (keyframe) => keyframe.frame === Math.floor(fromFrame),
    );
    this.#moveTrackPropertyKeyframeAtIndex(selection, id, index, toFrame);
  };

  #moveTrackPropertyKeyframeAtIndex = (
    selection: TrackSelection,
    id: PropertyChannelId,
    index: number,
    toFrame: number,
  ): void => {
    const project = this.#store.project;
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
    this.#store.project = { ...project, tracks };
    if (this.#pendingKeyframeDrag) {
      return;
    }
    this.#pushHistory({
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
  };

  #moveObjectPropertyKeyframe = (
    selection: ClipSelection,
    id: PropertyChannelId,
    fromFrame: number,
    toFrame: number,
  ): void => {
    const track = this.#store.project.tracks[selection.trackIndex];
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
    this.#moveObjectPropertyKeyframeAtIndex(selection, id, index, toFrame);
  };

  #moveObjectPropertyKeyframeAtIndex = (
    selection: ClipSelection,
    id: PropertyChannelId,
    index: number,
    toFrame: number,
  ): void => {
    const project = this.#store.project;
    const track = project.tracks[selection.trackIndex];
    if (!track) {
      return;
    }
    const item = track.items[selection.itemIndex];
    if (!item || !isClipNode(item) || !clipIsDrawable(item)) {
      return;
    }
    const objectLayer = clipPropertyLayer(item);
    const current = objectLayer[id]
      ? channelAtOrDefault(objectLayer, id)
      : null;
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
    this.#store.project = { ...project, tracks };
    if (this.#pendingKeyframeDrag) {
      return;
    }
    this.#pushHistory({
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
  };

  #applyValueToLayer = <K extends PropertyChannelId>(
    target: PropertyLayer,
    trackFallback: PropertyLayer,
    id: K,
    value: ChannelValueMap[K],
    frame: number,
  ): void => {
    const base = target[id]
      ? channelAtOrDefault(target, id)
      : channelAtOrDefault(trackFallback, id);
    const writeFrame = isChannelAnimated(base) ? Math.floor(frame) : 0;
    const widthBefore = evaluateChannel(
      target.width ?? trackFallback.width,
      "width",
      writeFrame,
    );
    const heightBefore = evaluateChannel(
      target.height ?? trackFallback.height,
      "height",
      writeFrame,
    );
    const lock = evaluateChannel(
      target.aspectRatioLock ?? trackFallback.aspectRatioLock,
      "aspectRatioLock",
      writeFrame,
    );
    writeChannel(target, id, upsertKeyframe(base, writeFrame, value));

    if (!lock || (id !== "width" && id !== "height")) {
      return;
    }
    const ratio = aspectRatio(widthBefore, heightBefore);
    if (id === "width") {
      const nextHeight = proportionalHeight(value as number, ratio);
      const heightBase = target.height
        ? channelAtOrDefault(target, "height")
        : channelAtOrDefault(trackFallback, "height");
      const heightFrame = isChannelAnimated(heightBase) ? writeFrame : 0;
      writeChannel(
        target,
        "height",
        upsertKeyframe(heightBase, heightFrame, nextHeight),
      );
      return;
    }
    const nextWidth = proportionalWidth(value as number, ratio);
    const widthBase = target.width
      ? channelAtOrDefault(target, "width")
      : channelAtOrDefault(trackFallback, "width");
    const widthFrame = isChannelAnimated(widthBase) ? writeFrame : 0;
    writeChannel(
      target,
      "width",
      upsertKeyframe(widthBase, widthFrame, nextWidth),
    );
  };

  #pushHistory = (entry: HistoryEntry): void => {
    this.#store.undoStack = pushUndoEntry(this.#store.undoStack, entry);
    this.#store.redoStack = [];
  };

  #applyHistoryItems = (
    trackIndex: number,
    items: TrackItem[],
    entry: HistoryEntry,
    clipProperties?: Map<string, unknown>,
    trackProperties?: PropertyLayer,
  ): void => {
    const project = this.#store.project;
    if (trackIndex < 0 || trackIndex >= project.tracks.length) {
      return;
    }
    const track = project.tracks[trackIndex];
    if (!track) {
      return;
    }
    if (clipProperties && entry.identity.clip) {
      restoreClipProperties(entry.identity.clip, clipProperties);
    }
    if (trackProperties) {
      restoreTrackProperties(track, trackProperties);
    }
    const nextItems = cloneTrackItems(items);
    const tracks = [...project.tracks];
    tracks[trackIndex] = {
      items: nextItems,
      properties: clonePropertyLayer(track.properties),
    };
    this.#store.project = { ...project, tracks };

    if (entry.identity.clip) {
      const itemIndex = nextItems.indexOf(entry.identity.clip);
      if (itemIndex >= 0) {
        this.#store.selection = { type: "clip", trackIndex, itemIndex };
      }
    } else {
      this.#store.selection = { type: "track", trackIndex };
    }

    const max = maxPlayheadFrames(this.#store.project);
    if (this.#store.playheadFrame > max) {
      this.#store.playheadFrame = max;
    }
  };

  #startTimer = (): void => {
    this.#clearTimer();
    this.#playOriginMs = performance.now();
    this.#playOriginFrame = this.#store.playheadFrame;
    this.#timer = setInterval(() => {
      this.#tick();
    }, 1000 / PLAYHEAD_FPS);
  };

  #clearTimer = (): void => {
    if (this.#timer === null) {
      return;
    }
    clearInterval(this.#timer);
    this.#timer = null;
  };

  #tick = (): void => {
    if (!this.#store.playing) {
      return;
    }
    const max = maxPlayheadFrames(this.#store.project);
    if (max <= 0) {
      this.stop();
      return;
    }
    const elapsedSeconds = (performance.now() - this.#playOriginMs) / 1000;
    const next =
      this.#playOriginFrame + Math.floor(elapsedSeconds * PLAYHEAD_FPS);
    if (next >= max) {
      this.#store.playheadFrame = max;
      this.stop();
      return;
    }
    this.#store.playheadFrame = next;
  };
}

function propertyLayersEqual(a: PropertyLayer, b: PropertyLayer): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function channelsEqual<T>(
  a: { interpolation: string; keyframes: { frame: number; value: T }[] },
  b: { interpolation: string; keyframes: { frame: number; value: T }[] },
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export type { EditorSelection };
