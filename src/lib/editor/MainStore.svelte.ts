import type { HistoryEntry } from "./history";
import {
  createEmptyProject,
  type EditorSelection,
  type Project,
} from "./types";

export class MainStore {
  project = $state<Project>(createEmptyProject());
  selection = $state<EditorSelection | null>(null);
  playheadFrame = $state(0);
  playing = $state(false);
  transportEpoch = $state(0);
  undoStack = $state<HistoryEntry[]>([]);
  redoStack = $state<HistoryEntry[]>([]);
}
