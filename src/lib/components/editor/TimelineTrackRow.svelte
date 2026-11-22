<script lang="ts">
  import type { MainAction } from "#lib/editor/MainAction.svelte.js";
  import type { MainStore } from "#lib/editor/MainStore.svelte.js";
  import { layoutTrack } from "#lib/editor/track-layout.js";
  import {
    isClipNode,
    isSpaceNode,
    type VideoTrack,
  } from "#lib/editor/types.js";
  import TimelineClip from "./TimelineClip.svelte";
  import TimelineSpace from "./TimelineSpace.svelte";

  let {
    track,
    trackIndex,
    maxFrames,
    pixelsPerFrame,
    store,
    action,
  }: {
    track: VideoTrack;
    trackIndex: number;
    maxFrames: number;
    pixelsPerFrame: number;
    store: MainStore;
    action: MainAction;
  } = $props();

  let layout = $derived(layoutTrack(track.items));
  let empty = $derived(track.items.length === 0);
  let selection = $derived(store.selection);

  function frameFromClientX(el: HTMLElement, clientX: number): number {
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.floor((clientX - rect.left) / pixelsPerFrame));
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  async function onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) {
      return;
    }
    const el = event.currentTarget as HTMLElement;
    const frame = frameFromClientX(el, event.clientX);
    for (const file of files) {
      if (!file.type.startsWith("video/")) {
        continue;
      }
      await action.dropVideoFile(file, trackIndex, frame);
    }
  }

  function isSelected(itemIndex: number): boolean {
    return (
      selection !== null &&
      selection.trackIndex === trackIndex &&
      selection.itemIndex === itemIndex
    );
  }
</script>

<div class="track-row">
  <div class="track-row__label">V{trackIndex + 1}</div>
  <div class="track-row__body">
    <div
      class="track-row__content"
      role="region"
      aria-label="Video track {trackIndex + 1}"
      style:width="{maxFrames * pixelsPerFrame}px"
      ondragover={onDragOver}
      ondrop={onDrop}
    >
      {#if empty}
        <p class="track-row__drop-hint">Drop video files here</p>
      {/if}
      {#each layout as entry (entry.itemIndex)}
        {@const item = track.items[entry.itemIndex]}
        {#if isSpaceNode(item)}
          <TimelineSpace lengthFrames={entry.lengthFrames} {pixelsPerFrame} />
        {:else if isClipNode(item)}
          <TimelineClip
            clip={item}
            {trackIndex}
            itemIndex={entry.itemIndex}
            startFrame={entry.startFrame}
            lengthFrames={entry.lengthFrames}
            selected={isSelected(entry.itemIndex)}
            {pixelsPerFrame}
            {store}
            {action}
          />
        {/if}
      {/each}
    </div>
  </div>
</div>

<style>
  .track-row {
    display: grid;
    grid-template-columns: 3rem auto;
    align-items: stretch;
    min-height: 3rem;
    width: max-content;
  }

  .track-row__label {
    display: grid;
    place-items: center;
    font-size: 0.7rem;
    font-weight: 700;
    color: #52606d;
    background: #dde2e8;
    border-right: 1px solid #c5cbd3;
  }

  .track-row__body {
    background: #f7f8fa;
  }

  .track-row__content {
    position: relative;
    display: flex;
    align-items: stretch;
    min-height: 3rem;
  }

  .track-row__drop-hint {
    position: absolute;
    inset: 0;
    margin: 0;
    display: grid;
    place-items: center;
    color: #8a93a0;
    font-size: 0.8rem;
    pointer-events: none;
  }
</style>
