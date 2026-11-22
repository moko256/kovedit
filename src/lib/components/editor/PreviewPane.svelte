<script lang="ts">
  import { Separator } from "#lib/components/ui/separator/index.js";
  import type { MainAction } from "#lib/editor/MainAction.svelte.js";
  import type { MainStore } from "#lib/editor/MainStore.svelte.js";
  import { activeClipAtPlayhead } from "#lib/editor/playhead.js";
  import { VideoPreviewSession } from "#lib/editor/video-preview.js";
  import PreviewTransport from "./PreviewTransport.svelte";

  let { store, action }: { store: MainStore; action: MainAction } = $props();

  let videoEl: HTMLVideoElement | undefined = $state();
  let session = new VideoPreviewSession();
  let hasFrame = $state(false);

  let active = $derived(
    activeClipAtPlayhead(store.project, store.playheadFrame),
  );
  let playing = $derived(store.playing);

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
  <div class="preview-pane__stage">
    <video
      class="preview-pane__video"
      class:preview-pane__video--visible={hasFrame}
      bind:this={videoEl}
      muted
      playsinline
      preload="auto"
    ></video>
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
    background: linear-gradient(180deg, #f7f8fa 0%, #e8ebf0 100%);
  }

  .preview-pane__video {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #111418;
    opacity: 0;
    pointer-events: none;
  }

  .preview-pane__video--visible {
    opacity: 1;
  }

  .preview-pane__empty {
    position: absolute;
    margin: 0;
    color: #7a8490;
    font-size: 0.95rem;
    pointer-events: none;
  }
</style>
