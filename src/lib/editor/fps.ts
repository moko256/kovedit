export const DEFAULT_FPS = 30;
export const PLAYHEAD_FPS = 60;

export function projectFps(info: { fps?: number }): number {
  return info.fps && info.fps > 0 ? info.fps : DEFAULT_FPS;
}

export function secondsToFrames(seconds: number, fps: number): number {
  return Math.max(1, Math.round(seconds * fps));
}

export function timelineFramesToPlayhead(
  frames: number,
  timelineFps: number,
): number {
  return Math.round(frames * (PLAYHEAD_FPS / timelineFps));
}

export function playheadToTimelineFrames(
  playheadFrame: number,
  timelineFps: number,
): number {
  return playheadFrame * (timelineFps / PLAYHEAD_FPS);
}
