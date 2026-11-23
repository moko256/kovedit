export function timelineFrameFromPointer(
  clientX: number,
  rulerLeft: number,
  pixelsPerFrame: number,
  maxFrames: number,
): number {
  if (pixelsPerFrame <= 0) {
    return 0;
  }
  const frame = Math.floor((clientX - rulerLeft) / pixelsPerFrame);
  return Math.min(maxFrames, Math.max(0, frame));
}
