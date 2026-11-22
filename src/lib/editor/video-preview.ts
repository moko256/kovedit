import {
  ALL_FORMATS,
  CanvasSink,
  Input,
  UrlSource,
  type WrappedCanvas,
} from "mediabunny";

export class VideoPreviewSession {
  #path = "";
  #input: Input | null = null;
  #sink: CanvasSink | null = null;
  #generation = 0;

  async draw(
    target: HTMLCanvasElement,
    path: string,
    timeSeconds: number,
  ): Promise<boolean> {
    const sink = await this.#ensure(path);
    if (!sink) {
      return false;
    }
    const generation = this.#generation;
    const wrapped = await sink.getCanvas(Math.max(0, timeSeconds));
    if (generation !== this.#generation || !wrapped) {
      return false;
    }
    this.#blit(target, wrapped);
    return true;
  }

  clear(target: HTMLCanvasElement): void {
    const ctx = target.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, target.width, target.height);
  }

  dispose(): void {
    this.#generation += 1;
    this.#path = "";
    this.#sink = null;
    const input = this.#input;
    this.#input = null;
    if (input) {
      input.dispose();
    }
  }

  async #ensure(path: string): Promise<CanvasSink | null> {
    if (path === this.#path && this.#sink) {
      return this.#sink;
    }
    this.dispose();
    if (!path) {
      return null;
    }
    const generation = this.#generation;
    const input = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(path),
    });
    const videoTrack = await input.getPrimaryVideoTrack();
    if (generation !== this.#generation) {
      input.dispose();
      return null;
    }
    if (!videoTrack || !(await videoTrack.canDecode())) {
      input.dispose();
      return null;
    }
    if (generation !== this.#generation) {
      input.dispose();
      return null;
    }
    const sink = new CanvasSink(videoTrack, { poolSize: 2 });
    this.#path = path;
    this.#input = input;
    this.#sink = sink;
    return sink;
  }

  #blit(target: HTMLCanvasElement, wrapped: WrappedCanvas): void {
    const source = wrapped.canvas;
    const width = source.width;
    const height = source.height;
    if (target.width !== width || target.height !== height) {
      target.width = width;
      target.height = height;
    }
    const ctx = target.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0);
  }
}
