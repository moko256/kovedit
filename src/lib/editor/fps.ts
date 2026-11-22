export const DEFAULT_FPS = 30;

export function projectFps(info: { fps?: number }): number {
  return info.fps && info.fps > 0 ? info.fps : DEFAULT_FPS;
}

export function secondsToFrames(seconds: number, fps: number): number {
  return Math.max(1, Math.round(seconds * fps));
}
