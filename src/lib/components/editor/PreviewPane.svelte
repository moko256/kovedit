<script lang="ts">
  import type { MainAction } from "$lib/editor/MainAction.svelte";
  import type { MainStore } from "$lib/editor/MainStore.svelte";
  import { activeClipAtPlayhead } from "$lib/editor/playhead";
  import { VideoPreviewSession } from "$lib/editor/video-preview";
  import PreviewTransport from "./PreviewTransport.svelte";

  let { store, action }: { store: MainStore; action: MainAction } = $props();

  let canvasEl: HTMLCanvasElement | undefined = $state();
  let session = new VideoPreviewSession();
  let hasFrame = $state(false);

  let active = $derived(
    activeClipAtPlayhead(store.project, store.playheadFrame),
  );

  $effect(() => {
    const clip = active;
    const target = canvasEl;
    if (!target) {
      return;
    }
    if (!clip) {
      session.clear(target);
      hasFrame = false;
      return;
    }
    let cancelled = false;
    void session.draw(target, clip.path, clip.mediaTimeSeconds).then((ok) => {
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
  <div class="preview-pane__stage">
    <canvas
      class="preview-pane__canvas"
      class:preview-pane__canvas--visible={hasFrame}
      bind:this={canvasEl}
    ></canvas>
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
    border-bottom: 1px solid #c5cbd3;
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
    display: grid;
    place-items: center;
    min-height: 0;
    background: linear-gradient(180deg, #f7f8fa 0%, #e8ebf0 100%);
  }

  .preview-pane__canvas {
    max-width: 100%;
    max-height: 100%;
    background: #111418;
    opacity: 0;
  }

  .preview-pane__canvas--visible {
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
