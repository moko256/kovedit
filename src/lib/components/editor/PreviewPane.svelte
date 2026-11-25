<script lang="ts">
  import { untrack } from "svelte";
  import { Separator } from "#lib/components/ui/separator/index.js";
  import type { MainAction } from "#lib/editor/MainAction.svelte.js";
  import type { MainStore } from "#lib/editor/MainStore.svelte.js";
  import {
    COMPOSITION_HEIGHT,
    COMPOSITION_WIDTH,
  } from "#lib/editor/composition.js";
  import { projectFps } from "#lib/editor/fps.js";
  import {
    animationDelayCss,
    buildPropertyCssAnimation,
    propertyAnimationName,
  } from "#lib/editor/property-css-animation.js";
  import {
    activeObjectsAtPlayhead,
    buildDrawableSvg,
    sceneObjectKey,
    type ActiveSceneObject,
  } from "#lib/editor/render/index.js";
  import { MediaElementPreviewSession } from "#lib/editor/video-preview.js";
  import PreviewTransport from "./PreviewTransport.svelte";

  let { store, action }: { store: MainStore; action: MainAction } = $props();

  let stageEl: HTMLDivElement | undefined = $state();
  let keyframesHostEl: HTMLDivElement | undefined = $state();
  let stageWidth = $state(0);
  let stageHeight = $state(0);
  let delayByKey = $state(new Map<string, string>());
  let mediaReady = $state(new Map<string, boolean>());

  const mediaSessions = new Map<string, MediaElementPreviewSession>();
  const mediaElements = new Map<string, HTMLMediaElement>();

  let playing = $derived(store.playing);
  let timelineFps = $derived(projectFps(store.project.info));
  let activeObjects = $derived(
    activeObjectsAtPlayhead(store.project, store.playheadFrame),
  );
  let drawableObjects = $derived(
    activeObjects.filter((object) => object.drawable),
  );
  let audioObjects = $derived(
    activeObjects.filter((object) => object.objectType === "audio"),
  );
  let previewObjects = $derived([...drawableObjects, ...audioObjects]);

  let objectAnimations = $derived.by(() => {
    const map = new Map<string, ReturnType<typeof buildPropertyCssAnimation>>();
    for (const object of drawableObjects) {
      map.set(
        sceneObjectKey(object),
        buildPropertyCssAnimation({
          name: propertyAnimationName(object.trackIndex, object.itemIndex),
          track: object.trackProperties,
          object: object.objectProperties,
          durationFrames: object.durationFrames,
          fps: timelineFps,
        }),
      );
    }
    return map;
  });

  let fitScale = $derived.by(() => {
    if (stageWidth <= 0 || stageHeight <= 0) {
      return 1;
    }
    return Math.min(
      stageWidth / COMPOSITION_WIDTH,
      stageHeight / COMPOSITION_HEIGHT,
    );
  });

  let hasVisibleFrame = $derived.by(() => {
    if (drawableObjects.length === 0) {
      return false;
    }
    return drawableObjects.some((object) => {
      if (object.objectType === "text") {
        return true;
      }
      return mediaReady.get(sceneObjectKey(object)) === true;
    });
  });

  function textSvgMarkup(object: ActiveSceneObject): string {
    return buildDrawableSvg({
      kind: "text",
      text: object.text,
      width: Math.max(1, object.transform.width),
      height: Math.max(1, object.transform.height),
    });
  }

  function bindMediaElement(node: HTMLMediaElement, key: string) {
    mediaElements.set(key, node);
    return {
      destroy() {
        mediaElements.delete(key);
        const session = mediaSessions.get(key);
        session?.clear(node);
      },
    };
  }

  function sessionFor(key: string): MediaElementPreviewSession {
    let session = mediaSessions.get(key);
    if (!session) {
      session = new MediaElementPreviewSession();
      mediaSessions.set(key, session);
    }
    return session;
  }

  function syncDelays(objects: ActiveSceneObject[], fps: number): void {
    const next = new Map<string, string>();
    for (const object of objects) {
      next.set(
        sceneObjectKey(object),
        animationDelayCss(object.localFrame, fps),
      );
    }
    delayByKey = next;
  }

  $effect(() => {
    const host = keyframesHostEl;
    const animations = objectAnimations;
    if (!host) {
      return;
    }
    let styleEl = host.querySelector("style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      host.appendChild(styleEl);
    }
    styleEl.textContent = [...animations.values()]
      .map((anim) => anim.keyframesCss)
      .join("\n");
  });

  $effect(() => {
    const isPlaying = playing;
    const fps = timelineFps;
    const objects = drawableObjects;
    if (!isPlaying) {
      syncDelays(objects, fps);
      return;
    }
    void store.transportEpoch;
    syncDelays(
      untrack(() => objects),
      fps,
    );
  });

  $effect(() => {
    const stage = stageEl;
    if (!stage) {
      return;
    }
    const measure = () => {
      stageWidth = stage.clientWidth;
      stageHeight = stage.clientHeight;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  });

  $effect(() => {
    const objects = previewObjects;
    const isPlaying = playing;
    const activeKeys = new Set(objects.map((object) => sceneObjectKey(object)));
    const cancellers: Array<() => void> = [];

    for (const [key, session] of [...mediaSessions]) {
      if (activeKeys.has(key)) {
        continue;
      }
      const el = mediaElements.get(key);
      if (el) {
        session.clear(el);
      }
      session.dispose();
      mediaSessions.delete(key);
    }

    const previousReady = untrack(() => mediaReady);
    const prunedReady = new Map(
      [...previousReady].filter(([key]) => activeKeys.has(key)),
    );
    if (prunedReady.size !== previousReady.size) {
      mediaReady = prunedReady;
    }

    for (const object of objects) {
      if (object.objectType === "text") {
        continue;
      }
      const key = sceneObjectKey(object);
      const target = mediaElements.get(key);
      if (!target || !object.path) {
        continue;
      }
      let cancelled = false;
      cancellers.push(() => {
        cancelled = true;
      });
      void sessionFor(key)
        .show(target, object.path, object.mediaTimeSeconds, isPlaying)
        .then((ok) => {
          if (cancelled) {
            return;
          }
          const current = untrack(() => mediaReady);
          if (current.get(key) === ok) {
            return;
          }
          const next = new Map(current);
          next.set(key, ok);
          mediaReady = next;
        });
    }

    return () => {
      for (const cancel of cancellers) {
        cancel();
      }
    };
  });

  $effect(() => {
    return () => {
      for (const session of mediaSessions.values()) {
        session.dispose();
      }
      mediaSessions.clear();
    };
  });
</script>

<section class="preview-pane">
  <header class="preview-pane__header">Preview</header>
  <Separator />
  <div class="preview-pane__stage" bind:this={stageEl}>
    <div
      class="preview-pane__composition"
      style:width="{COMPOSITION_WIDTH * fitScale}px"
      style:height="{COMPOSITION_HEIGHT * fitScale}px"
    >
      <div
        class="preview-pane__composition-inner"
        style:width="{COMPOSITION_WIDTH}px"
        style:height="{COMPOSITION_HEIGHT}px"
        style:transform="scale({fitScale})"
      >
        <div class="preview-pane__keyframes" bind:this={keyframesHostEl}></div>
        {#each previewObjects as object (sceneObjectKey(object))}
          {@const key = sceneObjectKey(object)}
          {@const anim = objectAnimations.get(key)}
          {@const delay = delayByKey.get(key) ?? "0s"}
          {#if object.objectType === "video"}
            <video
              class="preview-pane__object preview-pane__video"
              class:preview-pane__object--visible={mediaReady.get(key) &&
                !!anim}
              class:preview-pane__video--visible={mediaReady.get(key) && !!anim}
              use:bindMediaElement={key}
              data-prop-animation={anim ? anim.name : undefined}
              playsinline
              preload="auto"
              style:animation-name={anim ? anim.name : "none"}
              style:animation-duration={anim ? `${anim.durationSec}s` : "0s"}
              style:animation-delay={delay}
              style:animation-play-state={playing ? "running" : "paused"}
              style:animation-timing-function="linear"
              style:animation-iteration-count="1"
              style:animation-fill-mode="both"
            ></video>
          {:else if object.objectType === "audio"}
            <audio
              class="preview-pane__audio"
              use:bindMediaElement={key}
              preload="auto"
            ></audio>
          {:else if object.objectType === "text" && anim}
            <div
              class="preview-pane__object preview-pane__svg"
              class:preview-pane__object--visible={true}
              data-prop-animation={anim.name}
              style:animation-name={anim.name}
              style:animation-duration="{anim.durationSec}s"
              style:animation-delay={delay}
              style:animation-play-state={playing ? "running" : "paused"}
              style:animation-timing-function="linear"
              style:animation-iteration-count="1"
              style:animation-fill-mode="both"
            >
              {@html textSvgMarkup(object)}
            </div>
          {/if}
        {/each}
      </div>
    </div>
    {#if !hasVisibleFrame}
      <p class="preview-pane__empty">Preview</p>
    {/if}
  </div>
  <PreviewTransport {store} {action} />
</section>

<style>
  .preview-pane {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    background: #eceff3;
    border: 1px solid #c5cbd3;
  }

  .preview-pane__header {
    flex: 0 0 auto;
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #4a5562;
    background: #e2e6eb;
  }

  .preview-pane__stage {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: linear-gradient(180deg, #f7f8fa 0%, #e8ebf0 100%);
  }

  .preview-pane__composition {
    position: relative;
    overflow: hidden;
    background: #111418;
  }

  .preview-pane__composition-inner {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: top left;
  }

  .preview-pane__object {
    position: absolute;
    box-sizing: border-box;
    pointer-events: none;
  }

  .preview-pane__video {
    object-fit: fill;
    background: #111418;
  }

  .preview-pane__svg :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .preview-pane__object:not(.preview-pane__object--visible) {
    opacity: 0 !important;
  }

  .preview-pane__audio {
    display: none;
  }

  .preview-pane__empty {
    position: absolute;
    margin: 0;
    color: #7a8490;
    font-size: 0.95rem;
    pointer-events: none;
  }
</style>
