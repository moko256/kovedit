export type TimedAudioBuffer = {
  buffer: AudioBuffer;
  timelineStartSeconds: number;
};

export function mixAudioBuffers(
  context: BaseAudioContext,
  clips: TimedAudioBuffer[],
  durationSeconds: number,
  sampleRate = 48000,
  numberOfChannels = 2,
): AudioBuffer {
  const safeDuration = Math.max(1 / sampleRate, durationSeconds);
  const frameCount = Math.max(1, Math.ceil(safeDuration * sampleRate));
  const output = context.createBuffer(numberOfChannels, frameCount, sampleRate);

  for (const clip of clips) {
    const source = clip.buffer;
    const startFrame = Math.round(clip.timelineStartSeconds * sampleRate);
    const channels = Math.min(numberOfChannels, source.numberOfChannels);
    for (let channel = 0; channel < channels; channel++) {
      const dest = output.getChannelData(channel);
      const src = source.getChannelData(channel);
      for (let i = 0; i < src.length; i++) {
        const destIndex = startFrame + i;
        if (destIndex < 0 || destIndex >= dest.length) {
          continue;
        }
        dest[destIndex] += src[i] ?? 0;
      }
    }
  }

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const dest = output.getChannelData(channel);
    for (let i = 0; i < dest.length; i++) {
      const sample = dest[i] ?? 0;
      dest[i] = Math.max(-1, Math.min(1, sample));
    }
  }

  return output;
}

export function audioMixHasSignal(buffer: AudioBuffer): boolean {
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i] ?? 0) > 1e-6) {
        return true;
      }
    }
  }
  return false;
}
