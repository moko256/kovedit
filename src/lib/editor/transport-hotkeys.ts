export type TransportHotkeyAction =
  | { kind: "none" }
  | { kind: "undo" }
  | { kind: "redo" }
  | { kind: "togglePlay" }
  | { kind: "nudge"; delta: -1 | 1 };

export type TransportHotkeyInput = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  textEntry: boolean;
  transportSeek: boolean;
};

export function resolveTransportHotkey(
  input: TransportHotkeyInput,
): TransportHotkeyAction {
  if (input.metaKey || input.altKey) {
    return { kind: "none" };
  }

  if (input.ctrlKey) {
    const key = input.key.toLowerCase();
    if (key !== "z") {
      return { kind: "none" };
    }
    if (input.shiftKey) {
      return { kind: "redo" };
    }
    return { kind: "undo" };
  }

  if (input.shiftKey) {
    return { kind: "none" };
  }

  if (input.textEntry) {
    return { kind: "none" };
  }

  if (input.key === " ") {
    return { kind: "togglePlay" };
  }

  if (input.transportSeek) {
    return { kind: "none" };
  }

  if (input.key === "ArrowLeft") {
    return { kind: "nudge", delta: -1 };
  }

  if (input.key === "ArrowRight") {
    return { kind: "nudge", delta: 1 };
  }

  return { kind: "none" };
}
