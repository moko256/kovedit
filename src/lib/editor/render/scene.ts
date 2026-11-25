import {
  playheadToTimelineFrames,
  projectFps,
  timelineFramesToPlayhead,
} from "../fps";
import {
  resolveProperties,
  resolvedToPreviewTransform,
  type PreviewTransform,
  type PropertyLayer,
} from "../properties";
import { layoutTrack } from "../track-layout";
import {
  clipDurationFrames,
  clipIsDrawable,
  clipObjectType,
  clipPath,
  clipPlaybackRate,
  clipPropertyLayer,
  clipTextContent,
  isClipNode,
  type ClipNode,
  type ObjectType,
  type Project,
} from "../types";

export type ActiveSceneObject = {
  trackIndex: number;
  itemIndex: number;
  objectType: ObjectType;
  path: string;
  text: string;
  mediaTimeSeconds: number;
  localFrame: number;
  durationFrames: number;
  transform: PreviewTransform;
  trackProperties: PropertyLayer;
  objectProperties: PropertyLayer;
  clipStartPlayhead: number;
  clipEndPlayhead: number;
  drawable: boolean;
};

export function activeObjectsAtPlayhead(
  project: Project,
  playheadFrame: number,
): ActiveSceneObject[] {
  const timelineFps = projectFps(project.info);
  const timelineFrame = playheadToTimelineFrames(playheadFrame, timelineFps);
  const active: ActiveSceneObject[] = [];

  for (let trackIndex = 0; trackIndex < project.tracks.length; trackIndex++) {
    const track = project.tracks[trackIndex];
    if (!track) {
      continue;
    }
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
      const objectType = clipObjectType(item);
      const localFrame = timelineFrame - entry.startFrame;
      const objectProperties = clipPropertyLayer(item);
      const transform = resolvedToPreviewTransform(
        resolveProperties(track.properties, objectProperties, localFrame),
      );
      active.push({
        trackIndex,
        itemIndex: entry.itemIndex,
        objectType,
        path: clipPath(item),
        text: clipTextContent(item),
        mediaTimeSeconds: (localFrame * clipPlaybackRate(item)) / timelineFps,
        localFrame,
        durationFrames: Math.max(1, clipDurationFrames(item)),
        transform,
        trackProperties: track.properties,
        objectProperties,
        clipStartPlayhead: timelineFramesToPlayhead(
          entry.startFrame,
          timelineFps,
        ),
        clipEndPlayhead: timelineFramesToPlayhead(end, timelineFps),
        drawable: clipIsDrawable(item),
      });
    }
  }

  return active;
}

export function activeDrawableObjectsAtPlayhead(
  project: Project,
  playheadFrame: number,
): ActiveSceneObject[] {
  return activeObjectsAtPlayhead(project, playheadFrame).filter(
    (object) => object.drawable,
  );
}

export function sceneObjectKey(object: ActiveSceneObject): string {
  return `${object.trackIndex}:${object.itemIndex}:${object.objectType}`;
}

export function clipMediaTimeSeconds(
  clip: ClipNode,
  localFrame: number,
  timelineFps: number,
): number {
  return (localFrame * clipPlaybackRate(clip)) / timelineFps;
}
