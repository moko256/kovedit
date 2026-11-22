import { durationFramesForFile } from "./media";
import type { MainStore } from "./MainStore.svelte";
import { insertClipAtFrame, moveClipToFrame } from "./track-layout";
import type { ClipNode, ClipSelection, VideoTrack } from "./types";

export class MainAction {
  #store: MainStore;

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
    const nextTrack: VideoTrack = { type: "video", items };
    tracks[index] = nextTrack;
    this.#store.project = { ...project, tracks };

    const itemIndex = items.indexOf(clip);
    if (itemIndex >= 0) {
      this.#store.selection = { trackIndex: index, itemIndex };
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
    const tracks = [...project.tracks];
    tracks[trackIndex] = { type: "video", items };
    this.#store.project = { ...project, tracks };

    const nextIndex = items.indexOf(clip);
    if (nextIndex >= 0) {
      this.#store.selection = { trackIndex, itemIndex: nextIndex };
    }
  };
}
