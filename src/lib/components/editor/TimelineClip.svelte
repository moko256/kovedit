<script lang="ts">
  import {
    clipName,
    clipObjectType,
    type ClipNode,
  } from "#lib/editor/types.js";
  import type { TimelineActions } from "./timeline-actions.js";

  let {
    clip,
    trackIndex,
    itemIndex,
    startFrame,
    selected,
    pixelsPerFrame,
    actions,
  }: {
    clip: ClipNode;
    trackIndex: number;
    itemIndex: number;
    startFrame: number;
    selected: boolean;
    pixelsPerFrame: number;
    actions: Pick<
      TimelineActions,
      "selectClip" | "beginClipDrag" | "moveClip" | "endClipDrag"
    >;
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
    actions.selectClip({ trackIndex, itemIndex });
    actions.beginClipDrag(trackIndex, itemIndex);
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
    const deltaFrames = Math.round(
      (event.clientX - drag.originX) / pixelsPerFrame,
    );
    const nextStart = Math.max(0, drag.originStart + deltaFrames);
    actions.moveClip(trackIndex, clip, nextStart);
  }

  function onPointerUp(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    actions.endClipDrag();
    drag = null;
  }
</script>

<button
  type="button"
  class={[
    "clip",
    `clip--${clipObjectType(clip)}`,
    { "clip--selected": selected },
  ]}
  style:width="100%"
  onclick={() => actions.selectClip({ trackIndex, itemIndex })}
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
    box-sizing: border-box;
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

  .clip--audio {
    border-color: #3f7a5a;
    background: linear-gradient(180deg, #6fbf95 0%, #4f9a72 100%);
  }

  .clip--text {
    border-color: #8a6b3d;
    background: linear-gradient(180deg, #d6b778 0%, #b8944f 100%);
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
