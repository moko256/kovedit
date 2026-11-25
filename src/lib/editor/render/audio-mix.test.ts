import { describe, expect, test } from "vitest";
import { audioMixHasSignal, mixAudioBuffers } from "./audio-mix";

class FakeAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  #channels: Float32Array[];

  constructor(
    numberOfChannels: number,
    length: number,
    sampleRate: number,
    fill = 0,
  ) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.#channels = Array.from({ length: numberOfChannels }, () =>
      new Float32Array(length).fill(fill),
    );
  }

  getChannelData(channel: number): Float32Array {
    return this.#channels[channel] ?? new Float32Array(this.length);
  }
}

class FakeAudioContext {
  sampleRate: number;

  constructor(sampleRate = 48000) {
    this.sampleRate = sampleRate;
  }

  createBuffer(
    numberOfChannels: number,
    length: number,
    sampleRate: number,
  ): AudioBuffer {
    return new FakeAudioBuffer(
      numberOfChannels,
      length,
      sampleRate,
    ) as unknown as AudioBuffer;
  }
}

describe("audio mix", () => {
  test("sums overlapping buffers and clamps amplitude", () => {
    const context = new FakeAudioContext(4) as unknown as BaseAudioContext;
    const a = new FakeAudioBuffer(1, 4, 4, 0.8) as unknown as AudioBuffer;
    const b = new FakeAudioBuffer(1, 4, 4, 0.8) as unknown as AudioBuffer;
    const mixed = mixAudioBuffers(
      context,
      [
        { buffer: a, timelineStartSeconds: 0 },
        { buffer: b, timelineStartSeconds: 0 },
      ],
      1,
      4,
      1,
    );
    expect(mixed.getChannelData(0)[0]).toBeCloseTo(1, 5);
    expect(audioMixHasSignal(mixed)).toBe(true);
  });

  test("places buffers at timeline offsets", () => {
    const context = new FakeAudioContext(4) as unknown as BaseAudioContext;
    const source = new FakeAudioBuffer(1, 2, 4, 0.5) as unknown as AudioBuffer;
    const mixed = mixAudioBuffers(
      context,
      [{ buffer: source, timelineStartSeconds: 0.5 }],
      1,
      4,
      1,
    );
    const data = mixed.getChannelData(0);
    expect(data[0]).toBeCloseTo(0, 5);
    expect(data[1]).toBeCloseTo(0, 5);
    expect(data[2]).toBeCloseTo(0.5, 5);
    expect(data[3]).toBeCloseTo(0.5, 5);
  });
});
