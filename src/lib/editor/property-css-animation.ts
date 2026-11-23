import {
  anchorFractions,
  defaultChannelValue,
  normalizeChannel,
  resolveProperties,
  resolvedToPreviewTransform,
  type AnimatedChannel,
  type ChannelValueMap,
  type Interpolation,
  type PreviewTransform,
  type PropertyChannelId,
  type PropertyLayer,
} from "./properties";

const ANIMATABLE_CHANNELS: PropertyChannelId[] = [
  "anchor",
  "width",
  "height",
  "x",
  "y",
  "opacity",
  "rotation",
];

const TRANSFORM_EPSILON = 1e-3;

export type PropertyCssAnimation = {
  name: string;
  keyframesCss: string;
  durationSec: number;
};

export function animationDelaySec(localFrame: number, fps: number): number {
  const safeFps = fps > 0 ? fps : 1;
  const frame = Number.isFinite(localFrame) ? Math.max(0, localFrame) : 0;
  return -frame / safeFps;
}

export function animationDelayCss(localFrame: number, fps: number): string {
  return `${animationDelaySec(localFrame, fps)}s`;
}

export function effectiveChannel<K extends PropertyChannelId>(
  track: PropertyLayer,
  object: PropertyLayer | undefined,
  id: K,
): AnimatedChannel<ChannelValueMap[K]> {
  const objectChannel = object?.[id];
  if (objectChannel && objectChannel.keyframes.length > 0) {
    return (
      normalizeChannel(objectChannel) ?? {
        interpolation: objectChannel.interpolation,
        keyframes: objectChannel.keyframes,
      }
    );
  }
  const trackChannel = track[id];
  if (trackChannel && trackChannel.keyframes.length > 0) {
    return (
      normalizeChannel(trackChannel) ?? {
        interpolation: trackChannel.interpolation,
        keyframes: trackChannel.keyframes,
      }
    );
  }
  const hold = id === "anchor" || id === "aspectRatioLock" ? "hold" : "linear";
  return {
    interpolation: hold,
    keyframes: [{ frame: 0, value: defaultChannelValue(id) }],
  };
}

export function collectKeyframeFrames(
  track: PropertyLayer,
  object: PropertyLayer | undefined,
  durationFrames: number,
): number[] {
  const duration = Math.max(1, Math.floor(durationFrames));
  const frames = new Set<number>([0, duration]);
  for (const id of ANIMATABLE_CHANNELS) {
    const channel = effectiveChannel(track, object, id);
    for (const keyframe of channel.keyframes) {
      const frame = Math.floor(keyframe.frame);
      if (frame >= 0 && frame <= duration) {
        frames.add(frame);
      }
    }
  }
  return densifySampleFrames(
    track,
    object,
    [...frames].sort((a, b) => a - b),
  );
}

function previewAt(
  track: PropertyLayer,
  object: PropertyLayer | undefined,
  frame: number,
): PreviewTransform {
  return resolvedToPreviewTransform(resolveProperties(track, object, frame));
}

function transformsClose(a: PreviewTransform, b: PreviewTransform): boolean {
  return (
    Math.abs(a.left - b.left) <= TRANSFORM_EPSILON &&
    Math.abs(a.top - b.top) <= TRANSFORM_EPSILON &&
    Math.abs(a.width - b.width) <= TRANSFORM_EPSILON &&
    Math.abs(a.height - b.height) <= TRANSFORM_EPSILON &&
    Math.abs(a.opacity - b.opacity) <= TRANSFORM_EPSILON &&
    Math.abs(a.rotation - b.rotation) <= TRANSFORM_EPSILON &&
    Math.abs(a.originX - b.originX) <= TRANSFORM_EPSILON &&
    Math.abs(a.originY - b.originY) <= TRANSFORM_EPSILON
  );
}

function lerpTransform(
  a: PreviewTransform,
  b: PreviewTransform,
  t: number,
): PreviewTransform {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    width: a.width + (b.width - a.width) * t,
    height: a.height + (b.height - a.height) * t,
    opacity: a.opacity + (b.opacity - a.opacity) * t,
    rotation: a.rotation + (b.rotation - a.rotation) * t,
    anchor: t < 1 ? a.anchor : b.anchor,
    left: a.left + (b.left - a.left) * t,
    top: a.top + (b.top - a.top) * t,
    originX: a.originX + (b.originX - a.originX) * t,
    originY: a.originY + (b.originY - a.originY) * t,
  };
}

export function segmentTimingFunction(
  track: PropertyLayer,
  object: PropertyLayer | undefined,
  fromFrame: number,
  toFrame: number,
): "linear" | "step-end" {
  if (toFrame <= fromFrame) {
    return "step-end";
  }
  const start = previewAt(track, object, fromFrame);
  const end = previewAt(track, object, toFrame);
  const midFrame = (fromFrame + toFrame) / 2;
  const mid = previewAt(track, object, midFrame);
  if (transformsClose(mid, start)) {
    return "step-end";
  }
  const blended = lerpTransform(start, end, 0.5);
  if (transformsClose(mid, blended)) {
    return "linear";
  }
  if (segmentChannelsAreHold(track, object, fromFrame, toFrame)) {
    return "step-end";
  }
  return "linear";
}

function segmentChannelsAreHold(
  track: PropertyLayer,
  object: PropertyLayer | undefined,
  fromFrame: number,
  toFrame: number,
): boolean {
  for (const id of ANIMATABLE_CHANNELS) {
    const channel = effectiveChannel(track, object, id);
    if (!channelTouchesSpan(channel, fromFrame, toFrame)) {
      continue;
    }
    if (channel.interpolation !== "hold" && id !== "anchor") {
      return false;
    }
  }
  return true;
}

function channelTouchesSpan<T>(
  channel: AnimatedChannel<T>,
  fromFrame: number,
  toFrame: number,
): boolean {
  for (let i = 0; i < channel.keyframes.length; i++) {
    const frame = channel.keyframes[i].frame;
    if (frame > fromFrame && frame <= toFrame) {
      return true;
    }
    if (i < channel.keyframes.length - 1) {
      const next = channel.keyframes[i + 1].frame;
      if (frame <= fromFrame && next >= toFrame) {
        return true;
      }
    }
  }
  return channel.keyframes.length > 0;
}

function densifySampleFrames(
  track: PropertyLayer,
  object: PropertyLayer | undefined,
  frames: number[],
): number[] {
  if (frames.length < 2) {
    return frames;
  }
  const out: number[] = [frames[0]];
  for (let i = 0; i < frames.length - 1; i++) {
    const from = frames[i];
    const to = frames[i + 1];
    if (to <= from + 1) {
      out.push(to);
      continue;
    }
    const start = previewAt(track, object, from);
    const end = previewAt(track, object, to);
    const midFrame = (from + to) / 2;
    const mid = previewAt(track, object, midFrame);
    const blended = lerpTransform(start, end, 0.5);
    const fitsLinear = transformsClose(mid, blended);
    const fitsHold = transformsClose(mid, start);
    if (fitsLinear || fitsHold) {
      out.push(to);
      continue;
    }
    for (let frame = from + 1; frame <= to; frame++) {
      out.push(frame);
    }
  }
  return out;
}

function percentForFrame(frame: number, durationFrames: number): string {
  const duration = Math.max(1, durationFrames);
  const pct = (Math.max(0, Math.min(duration, frame)) / duration) * 100;
  const rounded = Math.round(pct * 10000) / 10000;
  return `${rounded}%`;
}

function cssNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  const rounded = Math.round(value * 10000) / 10000;
  return String(rounded);
}

export function transformToKeyframeDeclarations(
  transform: PreviewTransform,
): string {
  const originX = transform.originX * 100;
  const originY = transform.originY * 100;
  return [
    `left: ${cssNumber(transform.left)}px`,
    `top: ${cssNumber(transform.top)}px`,
    `width: ${cssNumber(transform.width)}px`,
    `height: ${cssNumber(transform.height)}px`,
    `opacity: ${cssNumber(transform.opacity)}`,
    `transform: rotate(${cssNumber(transform.rotation)}deg)`,
    `transform-origin: ${cssNumber(originX)}% ${cssNumber(originY)}%`,
  ].join("; ");
}

export function buildPropertyCssAnimation(options: {
  name: string;
  track: PropertyLayer;
  object?: PropertyLayer;
  durationFrames: number;
  fps: number;
}): PropertyCssAnimation {
  const durationFrames = Math.max(1, Math.floor(options.durationFrames));
  const fps = options.fps > 0 ? options.fps : 1;
  const durationSec = durationFrames / fps;
  const frames = collectKeyframeFrames(
    options.track,
    options.object,
    durationFrames,
  );
  const lines: string[] = [`@keyframes ${options.name} {`];
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const transform = previewAt(options.track, options.object, frame);
    const decls = transformToKeyframeDeclarations(transform);
    if (i < frames.length - 1) {
      const timing = segmentTimingFunction(
        options.track,
        options.object,
        frame,
        frames[i + 1],
      );
      lines.push(
        `  ${percentForFrame(frame, durationFrames)} { ${decls}; animation-timing-function: ${timing}; }`,
      );
    } else {
      lines.push(`  ${percentForFrame(frame, durationFrames)} { ${decls}; }`);
    }
  }
  lines.push("}");
  return {
    name: options.name,
    keyframesCss: lines.join("\n"),
    durationSec,
  };
}

export function propertyAnimationName(
  trackIndex: number,
  itemIndex: number,
): string {
  return `kovedit-prop-${trackIndex}-${itemIndex}`;
}

export function channelInterpolationForCss(
  interpolation: Interpolation,
): "linear" | "step-end" {
  return interpolation === "hold" ? "step-end" : "linear";
}

export function anchorToTransformOriginCss(
  anchor: PreviewTransform["anchor"],
): string {
  const fractions = anchorFractions(anchor);
  return `${cssNumber(fractions.x * 100)}% ${cssNumber(fractions.y * 100)}%`;
}
