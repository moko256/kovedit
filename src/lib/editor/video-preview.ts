export class VideoPreviewSession {
  #path = "";
  #generation = 0;

  async show(
    target: HTMLVideoElement,
    path: string,
    timeSeconds: number,
  ): Promise<boolean> {
    const ready = await this.#ensure(target, path);
    if (!ready) {
      return false;
    }
    const generation = this.#generation;
    const nextTime = Math.max(0, timeSeconds);
    if (Math.abs(target.currentTime - nextTime) > 1 / 120) {
      await this.#seek(target, nextTime, generation);
    }
    return generation === this.#generation && !target.error;
  }

  clear(target: HTMLVideoElement): void {
    this.#generation += 1;
    this.#path = "";
    target.pause();
    target.removeAttribute("src");
    target.load();
  }

  dispose(): void {
    this.#generation += 1;
    this.#path = "";
  }

  async #ensure(target: HTMLVideoElement, path: string): Promise<boolean> {
    if (!path) {
      this.clear(target);
      return false;
    }
    if (path === this.#path && target.currentSrc) {
      target.pause();
      return !target.error;
    }
    this.#generation += 1;
    const generation = this.#generation;
    this.#path = path;
    target.pause();
    target.src = path;
    target.load();
    const loaded = await this.#waitEvent(target, "loadeddata", generation);
    if (!loaded || generation !== this.#generation) {
      return false;
    }
    return !target.error;
  }

  async #seek(
    target: HTMLVideoElement,
    timeSeconds: number,
    generation: number,
  ): Promise<void> {
    if (generation !== this.#generation) {
      return;
    }
    if (target.readyState < HTMLMediaElement.HAVE_METADATA) {
      const ready = await this.#waitEvent(target, "loadedmetadata", generation);
      if (!ready || generation !== this.#generation) {
        return;
      }
    }
    const duration = Number.isFinite(target.duration) ? target.duration : null;
    const clamped =
      duration !== null && duration > 0
        ? Math.min(timeSeconds, Math.max(0, duration - 0.001))
        : timeSeconds;
    if (Math.abs(target.currentTime - clamped) <= 1 / 120) {
      return;
    }
    target.currentTime = clamped;
    await this.#waitEvent(target, "seeked", generation);
  }

  #waitEvent(
    target: HTMLVideoElement,
    type: "loadeddata" | "loadedmetadata" | "seeked",
    generation: number,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (generation !== this.#generation) {
        resolve(false);
        return;
      }
      const finish = (ok: boolean) => {
        target.removeEventListener(type, onSuccess);
        target.removeEventListener("error", onError);
        resolve(ok && generation === this.#generation);
      };
      const onSuccess = () => {
        finish(true);
      };
      const onError = () => {
        finish(false);
      };
      target.addEventListener(type, onSuccess, { once: true });
      target.addEventListener("error", onError, { once: true });
    });
  }
}
