import {
  ALL_FORMATS,
  AudioBufferSink,
  BlobSource,
  CanvasSink,
  Input,
  type InputAudioTrack,
  type InputVideoTrack,
  type WrappedAudioBuffer,
  type WrappedCanvas,
} from "mediabunny";
import { mediaAssetForPath } from "./media-assets";

export type MediaInputHandle = {
  input: Input;
  videoTrack: InputVideoTrack | null;
  audioTrack: InputAudioTrack | null;
};

const inputCache = new Map<string, Promise<MediaInputHandle | null>>();

export async function openMediaInput(
  path: string,
): Promise<MediaInputHandle | null> {
  if (!path) {
    return null;
  }
  const cached = inputCache.get(path);
  if (cached) {
    return cached;
  }
  const pending = (async () => {
    const file = mediaAssetForPath(path);
    if (!file) {
      return null;
    }
    const input = new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(file),
    });
    const [videoTrack, audioTrack] = await Promise.all([
      input.getPrimaryVideoTrack(),
      input.getPrimaryAudioTrack(),
    ]);
    return { input, videoTrack, audioTrack };
  })();
  inputCache.set(path, pending);
  const resolved = await pending;
  if (!resolved) {
    inputCache.delete(path);
  }
  return resolved;
}

export function clearMediaInputCache(): void {
  for (const pending of inputCache.values()) {
    void pending.then((handle) => {
      handle?.input.dispose();
    });
  }
  inputCache.clear();
}

export async function getMediaCanvasFrame(
  path: string,
  timeSeconds: number,
  options?: { width?: number; height?: number },
): Promise<WrappedCanvas | null> {
  const handle = await openMediaInput(path);
  if (!handle?.videoTrack) {
    return null;
  }
  const sink = new CanvasSink(handle.videoTrack, {
    width: options?.width,
    height: options?.height,
    fit: "fill",
    poolSize: 2,
  });
  return sink.getCanvas(Math.max(0, timeSeconds));
}

export async function collectMediaAudioBuffers(
  path: string,
  startSeconds: number,
  endSeconds: number,
): Promise<WrappedAudioBuffer[]> {
  const handle = await openMediaInput(path);
  if (!handle?.audioTrack) {
    return [];
  }
  const sink = new AudioBufferSink(handle.audioTrack);
  const buffers: WrappedAudioBuffer[] = [];
  for await (const buffer of sink.buffers(
    Math.max(0, startSeconds),
    Math.max(0, endSeconds),
  )) {
    buffers.push(buffer);
  }
  return buffers;
}
