import {
  playheadToTimelineFrames,
  projectFps,
  timelineFramesToPlayhead,
} from "./fps";
import { layoutTrack, totalTrackFrames } from "./track-layout";
import {
  clipObjectType,
  clipPath,
  clipPlaybackRate,
  isClipNode,
  type Project,
} from "./types";

export type ActiveClip = {
  trackIndex: number;
  itemIndex: number;
  path: string;
  mediaTimeSeconds: number;
  clipStartPlayhead: number;
  clipEndPlayhead: number;
};

export function maxTimelineFrames(project: Project): number {
  let max = 0;
  for (const track of project.tracks) {
    max = Math.max(max, totalTrackFrames(track.items));
  }
  return max;
}

export function maxPlayheadFrames(project: Project): number {
  const timelineFps = projectFps(project.info);
  return timelineFramesToPlayhead(maxTimelineFrames(project), timelineFps);
}

export function activeClipAtPlayhead(
  project: Project,
  playheadFrame: number,
): ActiveClip | null {
  const timelineFps = projectFps(project.info);
  const timelineFrame = playheadToTimelineFrames(playheadFrame, timelineFps);

  for (let trackIndex = 0; trackIndex < project.tracks.length; trackIndex++) {
    const track = project.tracks[trackIndex];
    const layout = layoutTrack(track.items);
    for (const entry of layout) {
      if (entry.kind !== "clip") {
        continue;
      }
      const end = entry.startFrame + entry.lengthFrames;
      if (timelineFrame < entry.startFrame || timelineFrame >= end) {
        continue;
      }
      const item = track.items[entry.itemIndex];
      if (!item || !isClipNode(item)) {
        continue;
      }
      if (clipObjectType(item) !== "video") {
        continue;
      }
      const path = clipPath(item);
      if (!path) {
        continue;
      }
      const localFrames = timelineFrame - entry.startFrame;
      return {
        trackIndex,
        itemIndex: entry.itemIndex,
        path,
        mediaTimeSeconds: (localFrames * clipPlaybackRate(item)) / timelineFps,
        clipStartPlayhead: timelineFramesToPlayhead(
          entry.startFrame,
          timelineFps,
        ),
        clipEndPlayhead: timelineFramesToPlayhead(end, timelineFps),
      };
    }
  }
  return null;
}
