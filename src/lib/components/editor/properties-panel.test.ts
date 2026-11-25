import { describe, expect, test } from "vitest";
import { MainAction } from "#lib/editor/MainAction.svelte.js";
import { MainStore } from "#lib/editor/MainStore.svelte.js";
import { createMediaClip } from "#lib/editor/types.js";
import {
  buildPropertiesPanel,
  channelForPropertiesPanel,
  propertiesPanelHandlersFromAction,
} from "./properties-panel.js";

describe("properties panel view model", () => {
  test("builds clip panel from store selection", () => {
    const store = new MainStore();
    const clip = createMediaClip({
      objectType: "video",
      path: "/a.mp4",
      name: "A",
      sourceDurationFrames: 60,
    });
    store.project.tracks[0].items = [clip];
    store.selection = { type: "clip", trackIndex: 0, itemIndex: 0 };

    const panel = buildPropertiesPanel(store);
    expect(panel?.kind).toBe("clip");
    expect(panel?.title).toBe("A");
    expect(panel?.media).toBe(true);
    expect(channelForPropertiesPanel(store, "opacity")).not.toBeNull();
  });

  test("binds handlers to MainAction", () => {
    const store = new MainStore();
    const action = new MainAction(store);
    const handlers = propertiesPanelHandlersFromAction(action);
    expect(typeof handlers.setPlaybackRate).toBe("function");
    expect(typeof handlers.setPropertyValue).toBe("function");
  });
});
