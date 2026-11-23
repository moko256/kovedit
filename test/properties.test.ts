import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDefaultTrackProperties,
  createStaticChannel,
  evaluateChannel,
  proportionalHeight,
  proportionalWidth,
  resolveProperties,
  upsertKeyframe,
  type PropertyLayer,
} from "../src/lib/editor/properties.js";

test("resolveProperties prefers object overrides over track", () => {
  const track = createDefaultTrackProperties();
  const object: PropertyLayer = {
    x: createStaticChannel(100),
    opacity: createStaticChannel(0.25),
  };
  const resolved = resolveProperties(track, object, 0);
  assert.equal(resolved.x.value, 100);
  assert.equal(resolved.x.source, "object");
  assert.equal(resolved.y.value, 540);
  assert.equal(resolved.y.source, "track");
  assert.equal(resolved.opacity.value, 0.25);
  assert.equal(resolved.opacity.source, "object");
  assert.equal(resolved.width.source, "track");
});

test("linear interpolation blends numeric keyframes", () => {
  const channel = {
    interpolation: "linear" as const,
    keyframes: [
      { frame: 0, value: 0 },
      { frame: 10, value: 100 },
    ],
  };
  assert.equal(evaluateChannel(channel, "x", 0), 0);
  assert.equal(evaluateChannel(channel, "x", 5), 50);
  assert.equal(evaluateChannel(channel, "x", 10), 100);
  assert.equal(evaluateChannel(channel, "x", 20), 100);
});

test("hold interpolation keeps left keyframe until next", () => {
  const channel = {
    interpolation: "hold" as const,
    keyframes: [
      { frame: 0, value: 0 },
      { frame: 10, value: 100 },
    ],
  };
  assert.equal(evaluateChannel(channel, "x", 0), 0);
  assert.equal(evaluateChannel(channel, "x", 5), 0);
  assert.equal(evaluateChannel(channel, "x", 9), 0);
  assert.equal(evaluateChannel(channel, "x", 10), 100);
});

test("aspect lock helpers keep proportions", () => {
  const ratio = 1920 / 1080;
  assert.equal(proportionalHeight(960, ratio), 540);
  assert.equal(proportionalWidth(540, ratio), 960);
});

test("upsertKeyframe updates existing frame and inserts others", () => {
  const base = createStaticChannel(10);
  const withMid = upsertKeyframe(base, 5, 20);
  assert.deepEqual(withMid.keyframes, [
    { frame: 0, value: 10 },
    { frame: 5, value: 20 },
  ]);
  const replaced = upsertKeyframe(withMid, 5, 30);
  assert.deepEqual(replaced.keyframes, [
    { frame: 0, value: 10 },
    { frame: 5, value: 30 },
  ]);
});

test("object can override track animation at a frame", () => {
  const track = createDefaultTrackProperties();
  track.x = {
    interpolation: "linear",
    keyframes: [
      { frame: 0, value: 0 },
      { frame: 10, value: 100 },
    ],
  };
  const object: PropertyLayer = {
    x: createStaticChannel(7),
  };
  const without = resolveProperties(track, undefined, 5);
  const withObject = resolveProperties(track, object, 5);
  assert.equal(without.x.value, 50);
  assert.equal(without.x.source, "track");
  assert.equal(withObject.x.value, 7);
  assert.equal(withObject.x.source, "object");
});
