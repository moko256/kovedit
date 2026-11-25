import {
  DEFAULT_VALUES,
  defaultChannelValue,
  PROPERTY_CHANNEL_IDS,
  type Anchor,
  type AnimatedChannel,
  type ChannelValueMap,
  type Interpolation,
  type Keyframe,
  type PropertyChannelId,
  type PropertyLayer,
  type PropertySource,
  type ResolvedChannel,
  type ResolvedProperties,
} from "./property-types";

export function createStaticChannel<T>(
  value: T,
  interpolation: Interpolation = "linear",
): AnimatedChannel<T> {
  return {
    keyframes: [{ frame: 0, value }],
    interpolation,
  };
}

export function createDefaultTrackProperties(): PropertyLayer {
  return {
    anchor: createStaticChannel(DEFAULT_VALUES.anchor, "hold"),
    width: createStaticChannel(DEFAULT_VALUES.width),
    height: createStaticChannel(DEFAULT_VALUES.height),
    aspectRatioLock: createStaticChannel(
      DEFAULT_VALUES.aspectRatioLock,
      "hold",
    ),
    x: createStaticChannel(DEFAULT_VALUES.x),
    y: createStaticChannel(DEFAULT_VALUES.y),
    opacity: createStaticChannel(DEFAULT_VALUES.opacity),
    rotation: createStaticChannel(DEFAULT_VALUES.rotation),
  };
}

export function cloneChannel<T>(
  channel: AnimatedChannel<T>,
): AnimatedChannel<T> {
  return {
    interpolation: channel.interpolation,
    keyframes: channel.keyframes.map((keyframe) => ({
      frame: keyframe.frame,
      value: keyframe.value,
    })),
  };
}

export function writeChannel<K extends PropertyChannelId>(
  layer: PropertyLayer,
  id: K,
  channel: AnimatedChannel<ChannelValueMap[K]>,
): void {
  (layer as Record<K, AnimatedChannel<ChannelValueMap[K]>>)[id] = channel;
}

export function clonePropertyLayer(layer: PropertyLayer): PropertyLayer {
  const next: PropertyLayer = {};
  for (const id of PROPERTY_CHANNEL_IDS) {
    switch (id) {
      case "anchor":
        if (layer.anchor) {
          writeChannel(next, id, cloneChannel(layer.anchor));
        }
        break;
      case "aspectRatioLock":
        if (layer.aspectRatioLock) {
          writeChannel(next, id, cloneChannel(layer.aspectRatioLock));
        }
        break;
      case "width":
      case "height":
      case "x":
      case "y":
      case "opacity":
      case "rotation":
        if (layer[id]) {
          writeChannel(next, id, cloneChannel(layer[id]));
        }
        break;
    }
  }
  return next;
}

function sortKeyframes<T>(keyframes: Keyframe<T>[]): Keyframe<T>[] {
  return [...keyframes].sort((a, b) => a.frame - b.frame);
}

export function normalizeChannel<T>(
  channel: AnimatedChannel<T>,
): AnimatedChannel<T> | null {
  if (!channel.keyframes.length) {
    return null;
  }
  const interpolation = channel.interpolation === "hold" ? "hold" : "linear";
  const keyframes = sortKeyframes(channel.keyframes).filter((keyframe) =>
    Number.isFinite(keyframe.frame),
  );
  if (!keyframes.length) {
    return null;
  }
  const deduped: Keyframe<T>[] = [];
  for (const keyframe of keyframes) {
    const frame = Math.floor(keyframe.frame);
    const last = deduped[deduped.length - 1];
    if (last && last.frame === frame) {
      last.value = keyframe.value;
      continue;
    }
    deduped.push({ frame, value: keyframe.value });
  }
  return { interpolation, keyframes: deduped };
}

function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function evaluateDiscrete<T>(
  keyframes: Keyframe<T>[],
  frame: number,
  interpolate: ((a: T, b: T, t: number) => T) | null,
  interpolation: Interpolation,
): T {
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (frame <= first.frame) {
    return first.value;
  }
  if (frame >= last.frame) {
    return last.value;
  }
  for (let i = 0; i < keyframes.length - 1; i++) {
    const left = keyframes[i];
    const right = keyframes[i + 1];
    if (frame < left.frame || frame > right.frame) {
      continue;
    }
    if (frame === right.frame) {
      return right.value;
    }
    if (
      interpolation === "hold" ||
      !interpolate ||
      left.frame === right.frame
    ) {
      return left.value;
    }
    const t = (frame - left.frame) / (right.frame - left.frame);
    return interpolate(left.value, right.value, t);
  }
  return last.value;
}

export function evaluateChannel<K extends PropertyChannelId>(
  channel: AnimatedChannel<ChannelValueMap[K]> | undefined,
  id: K,
  frame: number,
): ChannelValueMap[K] {
  const fallback = defaultChannelValue(id);
  if (!channel || channel.keyframes.length === 0) {
    return fallback;
  }
  const normalized = normalizeChannel(channel);
  if (!normalized) {
    return fallback;
  }
  const safeFrame = Number.isFinite(frame) ? Math.floor(frame) : 0;

  if (
    id === "width" ||
    id === "height" ||
    id === "x" ||
    id === "y" ||
    id === "opacity" ||
    id === "rotation"
  ) {
    return evaluateDiscrete(
      normalized.keyframes as Keyframe<number>[],
      safeFrame,
      lerpNumber,
      normalized.interpolation,
    ) as ChannelValueMap[K];
  }

  if (id === "aspectRatioLock") {
    return evaluateDiscrete(
      normalized.keyframes as Keyframe<boolean>[],
      safeFrame,
      null,
      "hold",
    ) as ChannelValueMap[K];
  }

  return evaluateDiscrete(
    normalized.keyframes as Keyframe<Anchor>[],
    safeFrame,
    null,
    "hold",
  ) as ChannelValueMap[K];
}

function writeResolved<K extends PropertyChannelId>(
  result: ResolvedProperties,
  id: K,
  value: ChannelValueMap[K],
  source: PropertySource,
): void {
  (result as Record<K, ResolvedChannel<ChannelValueMap[K]>>)[id] = {
    value,
    source,
  };
}

export function resolveProperties(
  track: PropertyLayer,
  object: PropertyLayer | undefined,
  frame: number,
): ResolvedProperties {
  const result = {} as ResolvedProperties;
  for (const id of PROPERTY_CHANNEL_IDS) {
    const objectChannel = object?.[id];
    if (objectChannel && objectChannel.keyframes.length > 0) {
      writeResolved(
        result,
        id,
        evaluateChannel(objectChannel, id, frame),
        "object",
      );
      continue;
    }
    writeResolved(result, id, evaluateChannel(track[id], id, frame), "track");
  }
  return result;
}

export function upsertKeyframe<T>(
  channel: AnimatedChannel<T>,
  frame: number,
  value: T,
): AnimatedChannel<T> {
  const next = cloneChannel(channel);
  const safeFrame = Math.floor(frame);
  const existing = next.keyframes.find(
    (keyframe) => keyframe.frame === safeFrame,
  );
  if (existing) {
    existing.value = value;
  } else {
    next.keyframes.push({ frame: safeFrame, value });
  }
  return (
    normalizeChannel(next) ?? createStaticChannel(value, next.interpolation)
  );
}

export function animationEndFrame(durationFrames: number): number {
  const duration = Math.max(1, Math.floor(durationFrames));
  return Math.max(1, duration - 1);
}

export function isChannelAnimated<T>(
  channel: AnimatedChannel<T> | undefined,
): boolean {
  return (channel?.keyframes.length ?? 0) >= 2;
}

export function channelStartFrame<T>(
  channel: AnimatedChannel<T> | undefined,
): number {
  if (!channel || channel.keyframes.length === 0) {
    return 0;
  }
  return Math.floor(channel.keyframes[0].frame);
}

export function channelLastFrame<T>(
  channel: AnimatedChannel<T> | undefined,
): number {
  if (!channel || channel.keyframes.length === 0) {
    return 0;
  }
  return Math.floor(channel.keyframes[channel.keyframes.length - 1].frame);
}

export function isEndpointKeyframeFrame<T>(
  channel: AnimatedChannel<T>,
  frame: number,
): boolean {
  if (!isChannelAnimated(channel)) {
    return false;
  }
  const safeFrame = Math.floor(frame);
  return (
    safeFrame === channelStartFrame(channel) ||
    safeFrame === channelLastFrame(channel)
  );
}

export function enableChannelAnimation<T>(
  channel: AnimatedChannel<T>,
  durationFrames: number,
  value: T,
): AnimatedChannel<T> {
  const end = animationEndFrame(durationFrames);
  return {
    interpolation: channel.interpolation,
    keyframes: [
      { frame: 0, value },
      { frame: end, value },
    ],
  };
}

export function disableChannelAnimation<T>(
  channel: AnimatedChannel<T>,
): AnimatedChannel<T> {
  const first = channel.keyframes[0];
  if (!first) {
    return {
      interpolation: channel.interpolation,
      keyframes: [],
    };
  }
  return createStaticChannel(first.value, channel.interpolation);
}

export function moveKeyframeAtIndex<T>(
  channel: AnimatedChannel<T>,
  index: number,
  toFrame: number,
): AnimatedChannel<T> {
  if (!isChannelAnimated(channel)) {
    return cloneChannel(channel);
  }
  const normalized =
    normalizeChannel(channel) ??
    createStaticChannel(channel.keyframes[0].value, channel.interpolation);
  if (index <= 0 || index >= normalized.keyframes.length - 1) {
    return normalized;
  }
  const start = channelStartFrame(normalized);
  const end = channelLastFrame(normalized);
  const min = start + 1;
  const max = end - 1;
  if (min > max) {
    return normalized;
  }
  let nextFrame = Math.min(max, Math.max(min, Math.floor(toFrame)));
  const others = normalized.keyframes.filter((_, i) => i !== index);
  while (others.some((keyframe) => keyframe.frame === nextFrame)) {
    if (nextFrame < max) {
      nextFrame += 1;
    } else if (nextFrame > min) {
      nextFrame -= 1;
    } else {
      return normalized;
    }
    if (nextFrame < min || nextFrame > max) {
      return normalized;
    }
  }
  const next = cloneChannel(normalized);
  next.keyframes[index] = {
    frame: nextFrame,
    value: next.keyframes[index].value,
  };
  return normalizeChannel(next) ?? normalized;
}

export function moveKeyframeFrame<T>(
  channel: AnimatedChannel<T>,
  fromFrame: number,
  toFrame: number,
): AnimatedChannel<T> {
  if (!isChannelAnimated(channel)) {
    return cloneChannel(channel);
  }
  const normalized =
    normalizeChannel(channel) ??
    createStaticChannel(channel.keyframes[0].value, channel.interpolation);
  const from = Math.floor(fromFrame);
  const index = normalized.keyframes.findIndex(
    (keyframe) => keyframe.frame === from,
  );
  return moveKeyframeAtIndex(normalized, index, toFrame);
}

export function setChannelInterpolation<T>(
  channel: AnimatedChannel<T>,
  interpolation: Interpolation,
): AnimatedChannel<T> {
  const next = cloneChannel(channel);
  next.interpolation = interpolation === "hold" ? "hold" : "linear";
  return next;
}

export function channelAtOrDefault<K extends PropertyChannelId>(
  layer: PropertyLayer,
  id: K,
): AnimatedChannel<ChannelValueMap[K]> {
  const existing = layer[id];
  if (existing && existing.keyframes.length > 0) {
    return cloneChannel(existing) as AnimatedChannel<ChannelValueMap[K]>;
  }
  const hold = id === "anchor" || id === "aspectRatioLock" ? "hold" : "linear";
  return createStaticChannel(defaultChannelValue(id), hold);
}

export function proportionalHeight(width: number, aspect: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(aspect) || aspect === 0) {
    return width;
  }
  return width / aspect;
}

export function proportionalWidth(height: number, aspect: number): number {
  if (!Number.isFinite(height) || !Number.isFinite(aspect) || aspect === 0) {
    return height;
  }
  return height * aspect;
}

export function aspectRatio(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || height === 0) {
    return 1;
  }
  return width / height;
}

export function applyValueToLayer<K extends PropertyChannelId>(
  target: PropertyLayer,
  trackFallback: PropertyLayer,
  id: K,
  value: ChannelValueMap[K],
  frame: number,
): void {
  const base = target[id]
    ? channelAtOrDefault(target, id)
    : channelAtOrDefault(trackFallback, id);
  const writeFrame = isChannelAnimated(base) ? Math.floor(frame) : 0;
  const widthBefore = evaluateChannel(
    target.width ?? trackFallback.width,
    "width",
    writeFrame,
  );
  const heightBefore = evaluateChannel(
    target.height ?? trackFallback.height,
    "height",
    writeFrame,
  );
  const lock = evaluateChannel(
    target.aspectRatioLock ?? trackFallback.aspectRatioLock,
    "aspectRatioLock",
    writeFrame,
  );
  writeChannel(target, id, upsertKeyframe(base, writeFrame, value));

  if (!lock || (id !== "width" && id !== "height")) {
    return;
  }
  const ratio = aspectRatio(widthBefore, heightBefore);
  if (id === "width") {
    const nextHeight = proportionalHeight(value as number, ratio);
    const heightBase = target.height
      ? channelAtOrDefault(target, "height")
      : channelAtOrDefault(trackFallback, "height");
    const heightFrame = isChannelAnimated(heightBase) ? writeFrame : 0;
    writeChannel(
      target,
      "height",
      upsertKeyframe(heightBase, heightFrame, nextHeight),
    );
    return;
  }
  const nextWidth = proportionalWidth(value as number, ratio);
  const widthBase = target.width
    ? channelAtOrDefault(target, "width")
    : channelAtOrDefault(trackFallback, "width");
  const widthFrame = isChannelAnimated(widthBase) ? writeFrame : 0;
  writeChannel(
    target,
    "width",
    upsertKeyframe(widthBase, widthFrame, nextWidth),
  );
}

export function propertyLayersEqual(
  a: PropertyLayer,
  b: PropertyLayer,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function channelsEqual<T>(
  a: { interpolation: string; keyframes: { frame: number; value: T }[] },
  b: { interpolation: string; keyframes: { frame: number; value: T }[] },
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
