import { describe, expect, test } from "vitest";
import { resolveTransportHotkey } from "./transport-hotkeys";

const base = {
  key: "",
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  textEntry: false,
  transportSeek: false,
};

describe("resolveTransportHotkey", () => {
  test("maps undo and redo chords", () => {
    expect(
      resolveTransportHotkey({ ...base, key: "z", ctrlKey: true }),
    ).toEqual({ kind: "undo" });
    expect(
      resolveTransportHotkey({
        ...base,
        key: "Z",
        ctrlKey: true,
        shiftKey: true,
      }),
    ).toEqual({ kind: "redo" });
    expect(
      resolveTransportHotkey({ ...base, key: "y", ctrlKey: true }),
    ).toEqual({ kind: "none" });
  });

  test("maps space and arrow nudges", () => {
    expect(resolveTransportHotkey({ ...base, key: " " })).toEqual({
      kind: "togglePlay",
    });
    expect(resolveTransportHotkey({ ...base, key: "ArrowLeft" })).toEqual({
      kind: "nudge",
      delta: -1,
    });
    expect(resolveTransportHotkey({ ...base, key: "ArrowRight" })).toEqual({
      kind: "nudge",
      delta: 1,
    });
  });

  test("ignores transport keys in text entry and seek slider", () => {
    expect(
      resolveTransportHotkey({ ...base, key: " ", textEntry: true }),
    ).toEqual({ kind: "none" });
    expect(
      resolveTransportHotkey({ ...base, key: "ArrowLeft", textEntry: true }),
    ).toEqual({ kind: "none" });
    expect(
      resolveTransportHotkey({
        ...base,
        key: "ArrowLeft",
        transportSeek: true,
      }),
    ).toEqual({ kind: "none" });
    expect(
      resolveTransportHotkey({
        ...base,
        key: "z",
        ctrlKey: true,
        textEntry: true,
      }),
    ).toEqual({ kind: "undo" });
  });

  test("ignores meta, alt, and bare shift", () => {
    expect(
      resolveTransportHotkey({ ...base, key: " ", metaKey: true }),
    ).toEqual({ kind: "none" });
    expect(
      resolveTransportHotkey({ ...base, key: "ArrowRight", altKey: true }),
    ).toEqual({ kind: "none" });
    expect(
      resolveTransportHotkey({ ...base, key: "ArrowLeft", shiftKey: true }),
    ).toEqual({ kind: "none" });
  });
});
