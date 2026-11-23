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
  evaluateChannel,
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
} from "./track-layout";
import {
  clipPropertyLayer,
  cloneClipProperties,
  cloneTrackProperties,
  createVideoTrack,
  isClipNode,
  restoreClipProperties,
  restoreTrackProperties,
  setClipPropertyLayer,
  type ClipNode,
  type ClipSelection,
  type EditorSelection,
  type TrackItem,
  type TrackSelection,
  type VideoTrack,
} from "./types";

type PendingClipDrag = {
  trackIndex: number;
  clip: ClipNode;
  before: TrackItem[];
};

export class MainAction {
  #store: MainStore;
  #timer: ReturnType<typeof setInterval> | null = null;
  #playOriginMs = 0;
  #playOriginFrame = 0;
  #pendingClipDrag: PendingClipDrag | null = null;

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

  ensureVideoTrack = (): void => {
    if (this.#store.project.tracks.length > 0) {
      return;
    }
    this.#store.project = {
      ...this.#store.project,
      tracks: [createVideoTrack()],
    };
  };

  dropVideoFile = async (
    file: File,
    trackIndex: number,
    frame: number,
  ): Promise<void> => {
    this.ensureVideoTrack();
    const project = this.#store.project;
    const tracks = [...project.tracks];
    let index = trackIndex;
    if (index < 0 || index >= tracks.length) {
      index = 0;
    }
    const track = tracks[index];
    if (!track || track.type !== "video") {
      return;
    }

    const durationFrames = await durationFramesForFile(file, project.info);
    const path = URL.createObjectURL(file);
    const clip: ClipNode = {
      properties: new Map<string, unknown>([
        ["path", path],
        ["name", file.name],
        ["durationFrames", durationFrames],
      ]),
    };

    const items = insertClipAtFrame(track.items, clip, frame);
    if (items === null) {
      return;
    }
    const nextTrack: VideoTrack = {
      type: "video",
      items,
      properties: clonePropertyLayer(track.properties),
    };
    tracks[index] = nextTrack;
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

  beginClipDrag = (trackIndex: number, itemIndex: number): void => {
    const project = this.#store.project;
    if (trackIndex < 0 || trackIndex >= project.tracks.length) {
      return;
    }
    const track = project.tracks[trackIndex];
    if (!track || track.type !== "video") {
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
    if (!track || track.type !== "video") {
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
      type: "video",
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
    if (!track || track.type !== "video") {
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

  #setTrackPropertyValue = <K extends PropertyChannelId>(
    selection: TrackSelection,
    id: K,
    value: ChannelValueMap[K],
    frame: number,
  ): void => {
    const project = this.#store.project;
    const track = project.tracks[selection.trackIndex];
    if (!track || track.type !== "video") {
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
      type: "video",
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
    if (!track || track.type !== "video") {
      return;
    }
    const item = track.items[selection.itemIndex];
    if (!item || !isClipNode(item)) {
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
      type: "video",
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
    if (!track || track.type !== "video") {
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
      type: "video",
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
    if (!track || track.type !== "video") {
      return;
    }
    const item = track.items[selection.itemIndex];
    if (!item || !isClipNode(item)) {
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
      type: "video",
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

  #applyValueToLayer = <K extends PropertyChannelId>(
    target: PropertyLayer,
    trackFallback: PropertyLayer,
    id: K,
    value: ChannelValueMap[K],
    frame: number,
  ): void => {
    const widthBefore = evaluateChannel(
      target.width ?? trackFallback.width,
      "width",
      frame,
    );
    const heightBefore = evaluateChannel(
      target.height ?? trackFallback.height,
      "height",
      frame,
    );
    const lock = evaluateChannel(
      target.aspectRatioLock ?? trackFallback.aspectRatioLock,
      "aspectRatioLock",
      frame,
    );
    const base = target[id]
      ? channelAtOrDefault(target, id)
      : channelAtOrDefault(trackFallback, id);
    writeChannel(target, id, upsertKeyframe(base, frame, value));

    if (!lock || (id !== "width" && id !== "height")) {
      return;
    }
    const ratio = aspectRatio(widthBefore, heightBefore);
    if (id === "width") {
      const nextHeight = proportionalHeight(value as number, ratio);
      const heightBase = target.height
        ? channelAtOrDefault(target, "height")
        : channelAtOrDefault(trackFallback, "height");
      writeChannel(
        target,
        "height",
        upsertKeyframe(heightBase, frame, nextHeight),
      );
      return;
    }
    const nextWidth = proportionalWidth(value as number, ratio);
    const widthBase = target.width
      ? channelAtOrDefault(target, "width")
      : channelAtOrDefault(trackFallback, "width");
    writeChannel(target, "width", upsertKeyframe(widthBase, frame, nextWidth));
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
    if (!track || track.type !== "video") {
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
      type: "video",
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

export type { EditorSelection };
