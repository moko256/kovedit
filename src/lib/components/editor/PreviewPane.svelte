<script lang="ts">
  import { untrack } from "svelte";
  import { Separator } from "#lib/components/ui/separator/index.js";
  import type { MainAction } from "#lib/editor/MainAction.svelte.js";
  import type { MainStore } from "#lib/editor/MainStore.svelte.js";
  import {
    COMPOSITION_HEIGHT,
    COMPOSITION_WIDTH,
  } from "#lib/editor/composition.js";
  import { playheadToTimelineFrames, projectFps } from "#lib/editor/fps.js";
  import { activeClipAtPlayhead } from "#lib/editor/playhead.js";
  import {
    animationDelayCss,
    buildPropertyCssAnimation,
    propertyAnimationName,
  } from "#lib/editor/property-css-animation.js";
  import { itemStartFrame } from "#lib/editor/track-layout.js";
  import {
    clipDurationFrames,
    clipPropertyLayer,
    isClipNode,
  } from "#lib/editor/types.js";
  import { VideoPreviewSession } from "#lib/editor/video-preview.js";
  import PreviewTransport from "./PreviewTransport.svelte";

  let { store, action }: { store: MainStore; action: MainAction } = $props();

  let videoEl: HTMLVideoElement | undefined = $state();
  let stageEl: HTMLDivElement | undefined = $state();
  let keyframesHostEl: HTMLDivElement | undefined = $state();
  let session = new VideoPreviewSession();
  let hasFrame = $state(false);
  let stageWidth = $state(0);
  let stageHeight = $state(0);
  let animationDelay = $state("0s");

  let active = $derived(
    activeClipAtPlayhead(store.project, store.playheadFrame),
  );
  let playing = $derived(store.playing);
  let timelineFps = $derived(projectFps(store.project.info));
  let activeTrackIndex = $derived(active?.trackIndex ?? -1);
  let activeItemIndex = $derived(active?.itemIndex ?? -1);

  let localFrame = $derived.by(() => {
    const trackIndex = activeTrackIndex;
    const itemIndex = activeItemIndex;
    if (trackIndex < 0 || itemIndex < 0) {
      return 0;
    }
    const track = store.project.tracks[trackIndex];
    if (!track) {
      return 0;
    }
    const timelineFrame = playheadToTimelineFrames(
      store.playheadFrame,
      timelineFps,
    );
    const start = itemStartFrame(track.items, itemIndex);
    return Math.max(0, timelineFrame - start);
  });

  let cssAnimation = $derived.by(() => {
    const trackIndex = activeTrackIndex;
    const itemIndex = activeItemIndex;
    if (trackIndex < 0 || itemIndex < 0) {
      return null;
    }
    const track = store.project.tracks[trackIndex];
    if (!track) {
      return null;
    }
    const item = track.items[itemIndex];
    if (!item || !isClipNode(item)) {
      return null;
    }
    return buildPropertyCssAnimation({
      name: propertyAnimationName(trackIndex, itemIndex),
      track: track.properties,
      object: clipPropertyLayer(item),
      durationFrames: Math.max(1, clipDurationFrames(item)),
      fps: timelineFps,
    });
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

  $effect(() => {
    const host = keyframesHostEl;
    const anim = cssAnimation;
    if (!host) {
      return;
    }
    let styleEl = host.querySelector("style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      host.appendChild(styleEl);
    }
    styleEl.textContent = anim ? anim.keyframesCss : "";
  });

  $effect(() => {
    const isPlaying = playing;
    const fps = timelineFps;
    if (!isPlaying) {
      animationDelay = animationDelayCss(localFrame, fps);
      return;
    }
    void store.transportEpoch;
    animationDelay = animationDelayCss(
      untrack(() => localFrame),
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
    const clip = active;
    const target = videoEl;
    const isPlaying = playing;
    if (!target) {
      return;
    }
    if (!clip) {
      session.clear(target);
      hasFrame = false;
      return;
    }
    let cancelled = false;
    void session
      .show(target, clip.path, clip.mediaTimeSeconds, isPlaying)
      .then((ok) => {
        if (!cancelled) {
          hasFrame = ok;
        }
      });
    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    return () => {
      session.dispose();
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
        <video
          class="preview-pane__video"
          class:preview-pane__video--visible={hasFrame && !!cssAnimation}
          bind:this={videoEl}
          data-prop-animation={cssAnimation ? cssAnimation.name : undefined}
          muted
          playsinline
          preload="auto"
          style:animation-name={cssAnimation ? cssAnimation.name : "none"}
          style:animation-duration={cssAnimation
            ? `${cssAnimation.durationSec}s`
            : "0s"}
          style:animation-delay={animationDelay}
          style:animation-play-state={playing ? "running" : "paused"}
          style:animation-timing-function="linear"
          style:animation-iteration-count="1"
          style:animation-fill-mode="both"
        ></video>
      </div>
    </div>
    {#if !hasFrame}
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

  .preview-pane__video {
    position: absolute;
    box-sizing: border-box;
    object-fit: fill;
    background: #111418;
    pointer-events: none;
  }

  .preview-pane__video:not(.preview-pane__video--visible) {
    opacity: 0 !important;
  }

  .preview-pane__empty {
    position: absolute;
    margin: 0;
    color: #7a8490;
    font-size: 0.95rem;
    pointer-events: none;
  }
</style>
