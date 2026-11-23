import { describe, expect, test } from "vitest";
import {
  animationDelaySec,
  buildPropertyCssAnimation,
  channelInterpolationForCss,
  collectKeyframeFrames,
  effectiveChannel,
  segmentTimingFunction,
} from "./property-css-animation";
import {
  createDefaultTrackProperties,
  createStaticChannel,
  type PropertyLayer,
} from "./properties";

describe("animationDelaySec", () => {
  test("maps frame N to -N/fps", () => {
    expect(animationDelaySec(0, 30)).toBe(-0);
    expect(animationDelaySec(30, 30)).toBe(-1);
    expect(animationDelaySec(15, 30)).toBe(-0.5);
    expect(animationDelaySec(60, 60)).toBe(-1);
  });

  test("clamps negative and non-finite frames", () => {
    expect(animationDelaySec(-10, 30)).toBe(-0);
    expect(animationDelaySec(Number.NaN, 30)).toBe(-0);
  });
});

describe("effectiveChannel object-over-track", () => {
  test("prefers object channel when present", () => {
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
    expect(effectiveChannel(track, object, "x").keyframes).toEqual([
      { frame: 0, value: 7 },
    ]);
    expect(effectiveChannel(track, undefined, "x").keyframes[1]?.value).toBe(
      100,
    );
  });
});

describe("hold vs linear timing", () => {
  test("linear channel yields linear segment timing", () => {
    const track = createDefaultTrackProperties();
    track.x = {
      interpolation: "linear",
      keyframes: [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ],
    };
    expect(segmentTimingFunction(track, undefined, 0, 10)).toBe("linear");
    expect(channelInterpolationForCss("linear")).toBe("linear");
  });

  test("hold channel yields step-end segment timing", () => {
    const track = createDefaultTrackProperties();
    track.x = {
      interpolation: "hold",
      keyframes: [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ],
    };
    expect(segmentTimingFunction(track, undefined, 0, 10)).toBe("step-end");
    expect(channelInterpolationForCss("hold")).toBe("step-end");
  });
});

describe("buildPropertyCssAnimation", () => {
  test("emits keyframes with delay-compatible duration", () => {
    const track = createDefaultTrackProperties();
    track.opacity = {
      interpolation: "linear",
      keyframes: [
        { frame: 0, value: 0 },
        { frame: 30, value: 1 },
      ],
    };
    const anim = buildPropertyCssAnimation({
      name: "kovedit-prop-0-0",
      track,
      durationFrames: 30,
      fps: 30,
    });
    expect(anim.durationSec).toBe(1);
    expect(anim.keyframesCss).toContain("@keyframes kovedit-prop-0-0");
    expect(anim.keyframesCss).toContain("animation-timing-function: linear");
    expect(anim.keyframesCss).toContain("opacity: 0");
    expect(anim.keyframesCss).toContain("opacity: 1");
    expect(collectKeyframeFrames(track, undefined, 30)).toEqual([0, 30]);
  });

  test("hold opacity uses step-end", () => {
    const track = createDefaultTrackProperties();
    track.opacity = {
      interpolation: "hold",
      keyframes: [
        { frame: 0, value: 0.2 },
        { frame: 20, value: 0.8 },
      ],
    };
    const anim = buildPropertyCssAnimation({
      name: "kovedit-prop-hold",
      track,
      durationFrames: 20,
      fps: 20,
    });
    expect(anim.durationSec).toBe(1);
    expect(anim.keyframesCss).toContain("animation-timing-function: step-end");
  });

  test("object override wins in generated keyframes", () => {
    const track = createDefaultTrackProperties();
    track.x = {
      interpolation: "linear",
      keyframes: [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ],
    };
    const object: PropertyLayer = {
      x: createStaticChannel(50),
    };
    const anim = buildPropertyCssAnimation({
      name: "kovedit-prop-override",
      track,
      object,
      durationFrames: 10,
      fps: 10,
    });
    expect(anim.keyframesCss).toContain("left: ");
    const frames = collectKeyframeFrames(track, object, 10);
    expect(frames[0]).toBe(0);
    expect(frames[frames.length - 1]).toBe(10);
  });
});
