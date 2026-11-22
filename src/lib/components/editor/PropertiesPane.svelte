<script lang="ts">
  import type { MainStore } from "$lib/editor/MainStore.svelte";
  import { clipName, clipPath, isClipNode } from "$lib/editor/types";

  let { store }: { store: MainStore } = $props();

  let selected = $derived.by(() => {
    const selection = store.selection;
    if (!selection) {
      return null;
    }
    const track = store.project.tracks[selection.trackIndex];
    if (!track) {
      return null;
    }
    const item = track.items[selection.itemIndex];
    if (!item || !isClipNode(item)) {
      return null;
    }
    return {
      name: clipName(item),
      path: clipPath(item),
    };
  });
</script>

<section class="properties-pane">
  <header class="properties-pane__header">Properties</header>
  <div class="properties-pane__body">
    {#if selected}
      <dl class="properties-pane__list">
        <div class="properties-pane__row">
          <dt>Name</dt>
          <dd>{selected.name}</dd>
        </div>
        <div class="properties-pane__row">
          <dt>Path</dt>
          <dd class="properties-pane__path">{selected.path}</dd>
        </div>
      </dl>
    {/if}
  </div>
</section>

<style>
  .properties-pane {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    background: #f3f5f7;
    border: 1px solid #c5cbd3;
  }

  .properties-pane__header {
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

  .properties-pane__body {
    flex: 1 1 auto;
    padding: 0.75rem;
    overflow: auto;
  }

  .properties-pane__list {
    margin: 0;
    display: grid;
    gap: 0.75rem;
  }

  .properties-pane__row {
    display: grid;
    gap: 0.2rem;
  }

  .properties-pane__row dt {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #6b7380;
  }

  .properties-pane__row dd {
    margin: 0;
    font-size: 0.85rem;
    color: #1f2933;
    word-break: break-word;
  }

  .properties-pane__path {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.75rem;
    color: #52606d;
  }
</style>
