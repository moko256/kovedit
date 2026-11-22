import { ALL_FORMATS, BlobSource, Input } from "mediabunny";
import { projectFps, secondsToFrames } from "./fps";
import type { ProjectInfo } from "./types";

export async function durationFramesForFile(
  file: File,
  info: ProjectInfo,
): Promise<number> {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file),
  });
  const seconds = await input.computeDuration();
  return secondsToFrames(seconds, projectFps(info));
}
