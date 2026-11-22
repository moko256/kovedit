import { PLAYHEAD_FPS, projectFps, timelineFramesToPlayhead } from "./fps";
import { durationFramesForFile } from "./media";
import type { MainStore } from "./MainStore.svelte";
import { maxPlayheadFrames } from "./playhead";
import {
  insertClipAtFrame,
  itemStartFrame,
  moveClipToFrame,
} from "./track-layout";
import type { ClipNode, ClipSelection, VideoTrack } from "./types";

export class MainAction {
  #store: MainStore;
  #timer: ReturnType<typeof setInterval> | null = null;

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

  #startTimer = (): void => {
    this.#clearTimer();
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
    const next = this.#store.playheadFrame + 1;
    if (next >= max) {
      this.#store.playheadFrame = max;
      this.stop();
      return;
    }
    this.#store.playheadFrame = next;
  };
}
