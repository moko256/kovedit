import type { Anchor, ResolvedProperties } from "./property-types";

export type AnchorFractions = { x: number; y: number };

export function anchorFractions(anchor: Anchor): AnchorFractions {
  const x = anchor.endsWith("left") ? 0 : anchor.endsWith("right") ? 1 : 0.5;
  const y = anchor.startsWith("top")
    ? 0
    : anchor.startsWith("bottom")
      ? 1
      : 0.5;
  return { x, y };
}

export type PreviewTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  anchor: Anchor;
  left: number;
  top: number;
  originX: number;
  originY: number;
};

export function resolvedToPreviewTransform(
  resolved: ResolvedProperties,
): PreviewTransform {
  const width = Math.max(0, resolved.width.value);
  const height = Math.max(0, resolved.height.value);
  const anchor = resolved.anchor.value;
  const fractions = anchorFractions(anchor);
  const x = resolved.x.value;
  const y = resolved.y.value;
  return {
    x,
    y,
    width,
    height,
    opacity: Math.min(1, Math.max(0, resolved.opacity.value)),
    rotation: resolved.rotation.value,
    anchor,
    left: x - fractions.x * width,
    top: y - fractions.y * height,
    originX: fractions.x,
    originY: fractions.y,
  };
}
