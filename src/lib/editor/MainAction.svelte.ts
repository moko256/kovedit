import {
  COMPOSITION_DEFAULT_CENTER_X,
  COMPOSITION_DEFAULT_CENTER_Y,
  normalizeCompositionCenter,
  type CompositionCenter,
} from "./composition";
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
  insertClipAtFrame,
  itemStartFrame,
  moveClipToFrame,
} from "./track-layout";
import {
  CLIP_PROP_CENTER_X,
  CLIP_PROP_CENTER_Y,
  clipCenter,
  cloneClipProperties,
  isClipNode,
  restoreClipProperties,
  type ClipNode,
  type ClipSelection,
  type TrackItem,
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

  selectClip = (selection: ClipSelection | null): void => {
    this.#store.selection = selection;
  };

  ensureVideoTrack = (): void => {
    if (this.#store.project.tracks.length > 0) {
      return;
    }
    this.#store.project = {
      ...this.#store.project,
      tracks: [{ type: "video", items: [] }],
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
        [CLIP_PROP_CENTER_X, COMPOSITION_DEFAULT_CENTER_X],
        [CLIP_PROP_CENTER_Y, COMPOSITION_DEFAULT_CENTER_Y],
      ]),
    };

    const items = insertClipAtFrame(track.items, clip, frame);
    if (items === null) {
      return;
    }
    const nextTrack: VideoTrack = { type: "video", items };
    tracks[index] = nextTrack;
    this.#store.project = { ...project, tracks };

    const itemIndex = items.indexOf(clip);
    if (itemIndex >= 0) {
      this.#store.selection = { trackIndex: index, itemIndex };
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
    tracks[trackIndex] = { type: "video", items };
    this.#store.project = { ...project, tracks };

    const nextIndex = items.indexOf(clip);
    if (nextIndex >= 0) {
      this.#store.selection = { trackIndex, itemIndex: nextIndex };
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

  setClipCenter = (center: CompositionCenter): void => {
    if (this.#pendingClipDrag) {
      return;
    }
    const selection = this.#store.selection;
    if (!selection) {
      return;
    }
    const project = this.#store.project;
    const track = project.tracks[selection.trackIndex];
    if (!track || track.type !== "video") {
      return;
    }
    const item = track.items[selection.itemIndex];
    if (!item || !isClipNode(item)) {
      return;
    }

    const next = normalizeCompositionCenter(center);
    if (!next) {
      return;
    }
    const current = clipCenter(item);
    if (current.x === next.x && current.y === next.y) {
      return;
    }

    const before = cloneTrackItems(track.items);
    const clipPropertiesBefore = cloneClipProperties(item);
    item.properties.set(CLIP_PROP_CENTER_X, next.x);
    item.properties.set(CLIP_PROP_CENTER_Y, next.y);
    const tracks = [...project.tracks];
    tracks[selection.trackIndex] = { type: "video", items: [...track.items] };
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
    );
  };

  seek = (playheadFrame: number): void => {
    const max = maxPlayheadFrames(this.#store.project);
    const next = Math.max(0, Math.floor(playheadFrame));
    this.#store.playheadFrame = max > 0 ? Math.min(next, max) : 0;
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

  #pushHistory = (entry: HistoryEntry): void => {
    this.#store.undoStack = pushUndoEntry(this.#store.undoStack, entry);
    this.#store.redoStack = [];
  };

  #applyHistoryItems = (
    trackIndex: number,
    items: TrackItem[],
    entry: HistoryEntry,
    clipProperties?: Map<string, unknown>,
  ): void => {
    const project = this.#store.project;
    if (trackIndex < 0 || trackIndex >= project.tracks.length) {
      return;
    }
    const track = project.tracks[trackIndex];
    if (!track || track.type !== "video") {
      return;
    }
    if (clipProperties) {
      restoreClipProperties(entry.identity.clip, clipProperties);
    }
    const nextItems = cloneTrackItems(items);
    const tracks = [...project.tracks];
    tracks[trackIndex] = { type: "video", items: nextItems };
    this.#store.project = { ...project, tracks };

    const itemIndex = nextItems.indexOf(entry.identity.clip);
    if (itemIndex >= 0) {
      this.#store.selection = { trackIndex, itemIndex };
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
