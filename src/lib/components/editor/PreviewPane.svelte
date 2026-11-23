<script lang="ts">
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
    resolveProperties,
    resolvedToPreviewTransform,
  } from "#lib/editor/properties.js";
  import { itemStartFrame } from "#lib/editor/track-layout.js";
  import { clipPropertyLayer, isClipNode } from "#lib/editor/types.js";
  import { VideoPreviewSession } from "#lib/editor/video-preview.js";
  import PreviewTransport from "./PreviewTransport.svelte";

  let { store, action }: { store: MainStore; action: MainAction } = $props();

  let videoEl: HTMLVideoElement | undefined = $state();
  let stageEl: HTMLDivElement | undefined = $state();
  let session = new VideoPreviewSession();
  let hasFrame = $state(false);
  let stageWidth = $state(0);
  let stageHeight = $state(0);

  let active = $derived(
    activeClipAtPlayhead(store.project, store.playheadFrame),
  );
  let playing = $derived(store.playing);

  let previewTransform = $derived.by(() => {
    const clip = active;
    if (!clip) {
      return null;
    }
    const track = store.project.tracks[clip.trackIndex];
    if (!track) {
      return null;
    }
    const item = track.items[clip.itemIndex];
    if (!item || !isClipNode(item)) {
      return null;
    }
    const timelineFrame = playheadToTimelineFrames(
      store.playheadFrame,
      projectFps(store.project.info),
    );
    const start = itemStartFrame(track.items, clip.itemIndex);
    const localFrame = Math.max(0, timelineFrame - start);
    const resolved = resolveProperties(
      track.properties,
      clipPropertyLayer(item),
      localFrame,
    );
    return resolvedToPreviewTransform(resolved);
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
        <video
          class="preview-pane__video"
          bind:this={videoEl}
          muted
          playsinline
          preload="auto"
          style:left={previewTransform ? `${previewTransform.left}px` : "0"}
          style:top={previewTransform ? `${previewTransform.top}px` : "0"}
          style:width={previewTransform
            ? `${previewTransform.width}px`
            : "100%"}
          style:height={previewTransform
            ? `${previewTransform.height}px`
            : "100%"}
          style:opacity={hasFrame && previewTransform
            ? previewTransform.opacity
            : 0}
          style:transform={previewTransform
            ? `rotate(${previewTransform.rotation}deg)`
            : "none"}
          style:transform-origin={previewTransform
            ? `${previewTransform.originX * 100}% ${previewTransform.originY * 100}%`
            : "50% 50%"}
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

  .preview-pane__empty {
    position: absolute;
    margin: 0;
    color: #7a8490;
    font-size: 0.95rem;
    pointer-events: none;
  }
</style>
