import type { HistoryEntry } from "./history";
import { createEmptyProject, type ClipSelection, type Project } from "./types";

export class MainStore {
  project = $state<Project>(createEmptyProject());
  selection = $state<ClipSelection | null>(null);
  playheadFrame = $state(0);
  playing = $state(false);
  undoStack = $state<HistoryEntry[]>([]);
  redoStack = $state<HistoryEntry[]>([]);
}
