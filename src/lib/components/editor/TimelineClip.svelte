<script lang="ts">
  import type { MainAction } from "$lib/editor/MainAction.svelte";
  import type { MainStore } from "$lib/editor/MainStore.svelte";
  import { clipName, type ClipNode } from "$lib/editor/types";

  let {
    clip,
    trackIndex,
    itemIndex,
    startFrame,
    lengthFrames,
    selected,
    pixelsPerFrame,
    store,
    action,
  }: {
    clip: ClipNode;
    trackIndex: number;
    itemIndex: number;
    startFrame: number;
    lengthFrames: number;
    selected: boolean;
    pixelsPerFrame: number;
    store: MainStore;
    action: MainAction;
  } = $props();

  let drag: {
    originStart: number;
    pointerId: number;
    originX: number;
  } | null = $state(null);

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    action.selectClip({ trackIndex, itemIndex });
    drag = {
      originStart: startFrame,
      pointerId: event.pointerId,
      originX: event.clientX,
    };
  }

  function onPointerMove(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const track = store.project.tracks[trackIndex];
    if (!track) {
      return;
    }
    const currentIndex = track.items.indexOf(clip);
    if (currentIndex < 0) {
      return;
    }
    const deltaFrames = Math.round(
      (event.clientX - drag.originX) / pixelsPerFrame,
    );
    const nextStart = Math.max(0, drag.originStart + deltaFrames);
    action.moveClip(trackIndex, currentIndex, nextStart);
  }

  function onPointerUp(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    drag = null;
  }
</script>

<button
  type="button"
  class={["clip", { "clip--selected": selected }]}
  style:width="{Math.max(lengthFrames, 1) * pixelsPerFrame}px"
  onclick={() => action.selectClip({ trackIndex, itemIndex })}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
>
  <span class="clip__name">{clipName(clip)}</span>
</button>

<style>
  .clip {
    flex: 0 0 auto;
    height: 2.5rem;
    margin-block: 0.25rem;
    padding: 0 0.4rem;
    border: 1px solid #3d6b8f;
    border-radius: 2px;
    background: linear-gradient(180deg, #6fa3c7 0%, #4f87ad 100%);
    color: #0f1a22;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    text-align: left;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
  }

  .clip:active {
    cursor: grabbing;
  }

  .clip--selected {
    outline: 2px solid #1f4e6b;
    outline-offset: 1px;
  }

  .clip__name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
