<script lang="ts">
  import type { MainStore } from "$lib/editor/MainStore.svelte";
  import { clipPath, isClipNode } from "$lib/editor/types";

  let { store }: { store: MainStore } = $props();

  let previewSrc = $derived.by(() => {
    const selection = store.selection;
    if (!selection) {
      return "";
    }
    const track = store.project.tracks[selection.trackIndex];
    if (!track) {
      return "";
    }
    const item = track.items[selection.itemIndex];
    if (!item || !isClipNode(item)) {
      return "";
    }
    return clipPath(item);
  });
</script>

<section class="preview-pane">
  <header class="preview-pane__header">Preview</header>
  <div class="preview-pane__stage">
    {#if previewSrc}
      <video
        class="preview-pane__video"
        src={previewSrc}
        controls
        muted
        playsinline
      ></video>
    {:else}
      <p class="preview-pane__empty">Preview</p>
    {/if}
  </div>
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
    flex: 1 1 auto;
    display: grid;
    place-items: center;
    min-height: 0;
    background: linear-gradient(180deg, #f7f8fa 0%, #e8ebf0 100%);
  }

  .preview-pane__video {
    width: 100%;
    height: 100%;
    max-height: 100%;
    object-fit: contain;
    background: #111418;
  }

  .preview-pane__empty {
    margin: 0;
    color: #7a8490;
    font-size: 0.95rem;
  }
</style>
