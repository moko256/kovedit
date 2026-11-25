import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
} from "mediabunny";
import { COMPOSITION_HEIGHT, COMPOSITION_WIDTH } from "../composition";
import { projectFps, timelineFramesToPlayhead } from "../fps";
import { maxTimelineFrames } from "../playhead";
import { layoutTrack } from "../track-layout";
import {
  clipObjectType,
  clipPath,
  clipPlaybackRate,
  clipSourceDurationFrames,
  isClipNode,
  type Project,
} from "../types";
import {
  compositeSceneFrame,
  createCompositionCanvas,
} from "./composite-frame";
import { collectMediaAudioBuffers } from "./media-decode";
import { activeObjectsAtPlayhead } from "./scene";

export type ExportProgress = {
  phase: "video" | "audio" | "finalize";
  currentFrame: number;
  totalFrames: number;
};

export type ExportProjectOptions = {
  project: Project;
  fileName?: string;
  onProgress?: (progress: ExportProgress) => void;
  download?: boolean;
};

export type ExportProjectResult = {
  blob: Blob;
  fileName: string;
  mimeType: string;
  frameCount: number;
  hasAudio: boolean;
};

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function resolveOfflineAudioContext(
  sampleRate: number,
  durationSeconds: number,
): OfflineAudioContext | null {
  if (typeof OfflineAudioContext === "undefined") {
    return null;
  }
  const frameCount = Math.max(1, Math.ceil(durationSeconds * sampleRate));
  return new OfflineAudioContext(2, frameCount, sampleRate);
}

export async function collectProjectAudioBuffer(
  project: Project,
  durationSeconds: number,
  sampleRate = 48000,
): Promise<AudioBuffer | null> {
  const offline = resolveOfflineAudioContext(sampleRate, durationSeconds);
  if (!offline) {
    return null;
  }

  const timelineFps = projectFps(project.info);
  let scheduled = 0;

  for (const track of project.tracks) {
    const layout = layoutTrack(track.items);
    for (const entry of layout) {
      if (entry.kind !== "clip") {
        continue;
      }
      const item = track.items[entry.itemIndex];
      if (!item || !isClipNode(item)) {
        continue;
      }
      const objectType = clipObjectType(item);
      if (objectType !== "video" && objectType !== "audio") {
        continue;
      }
      const path = clipPath(item);
      if (!path) {
        continue;
      }
      const rate = clipPlaybackRate(item);
      const sourceSeconds = clipSourceDurationFrames(item) / timelineFps;
      const buffers = await collectMediaAudioBuffers(path, 0, sourceSeconds);
      const timelineStartSeconds = entry.startFrame / timelineFps;
      for (const wrapped of buffers) {
        const source = offline.createBufferSource();
        source.buffer = wrapped.buffer;
        source.playbackRate.value = rate;
        source.connect(offline.destination);
        source.start(
          Math.max(0, timelineStartSeconds + wrapped.timestamp / rate),
        );
        scheduled += 1;
      }
    }
  }

  if (scheduled === 0) {
    return null;
  }

  return offline.startRendering();
}

export async function exportProjectToMp4(
  options: ExportProjectOptions,
): Promise<ExportProjectResult> {
  const project = options.project;
  const timelineFps = projectFps(project.info);
  const totalTimelineFrames = Math.max(1, maxTimelineFrames(project));
  const durationSeconds = totalTimelineFrames / timelineFps;
  const frameDuration = 1 / timelineFps;
  const fileName = options.fileName ?? "kovedit-export.mp4";

  const canvas = createCompositionCanvas(COMPOSITION_WIDTH, COMPOSITION_HEIGHT);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create export canvas context");
  }

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat(),
    target,
  });

  const videoCodec = await getFirstEncodableVideoCodec(
    output.format.getSupportedVideoCodecs(),
    {
      width: COMPOSITION_WIDTH,
      height: COMPOSITION_HEIGHT,
    },
  );
  if (!videoCodec) {
    throw new Error("No encodable video codec available for export");
  }

  const canvasSource = new CanvasSource(canvas, {
    codec: videoCodec,
    quality: new Quality("high"),
  });
  output.addVideoTrack(canvasSource, { frameRate: timelineFps });

  options.onProgress?.({
    phase: "audio",
    currentFrame: 0,
    totalFrames: totalTimelineFrames,
  });
  const mixedAudio = await collectProjectAudioBuffer(
    project,
    durationSeconds,
    48000,
  );
  let audioSource: AudioBufferSource | null = null;
  if (mixedAudio) {
    const audioCodec = await getFirstEncodableAudioCodec(
      output.format.getSupportedAudioCodecs(),
      {
        numberOfChannels: mixedAudio.numberOfChannels,
        sampleRate: mixedAudio.sampleRate,
      },
    );
    if (audioCodec) {
      audioSource = new AudioBufferSource({
        codec: audioCodec,
        quality: new Quality("high"),
      });
      output.addAudioTrack(audioSource);
    }
  }

  await output.start();

  for (
    let timelineFrame = 0;
    timelineFrame < totalTimelineFrames;
    timelineFrame++
  ) {
    options.onProgress?.({
      phase: "video",
      currentFrame: timelineFrame,
      totalFrames: totalTimelineFrames,
    });
    const playhead = timelineFramesToPlayhead(timelineFrame, timelineFps);
    const objects = activeObjectsAtPlayhead(project, playhead);
    await compositeSceneFrame(ctx, objects);
    await canvasSource.add(timelineFrame * frameDuration, frameDuration);
  }
  canvasSource.close();

  if (audioSource && mixedAudio) {
    await audioSource.add(mixedAudio);
    audioSource.close();
  }

  options.onProgress?.({
    phase: "finalize",
    currentFrame: totalTimelineFrames,
    totalFrames: totalTimelineFrames,
  });
  await output.finalize();

  const buffer = target.buffer;
  if (!buffer) {
    throw new Error("Export produced an empty buffer");
  }
  const mimeType = output.format.mimeType;
  const blob = new Blob([buffer], { type: mimeType });
  if (options.download !== false) {
    downloadBlob(blob, fileName);
  }

  return {
    blob,
    fileName,
    mimeType,
    frameCount: totalTimelineFrames,
    hasAudio: Boolean(audioSource && mixedAudio),
  };
}
