<script lang="ts">
  import { timelineFrameFromPointer } from "#lib/editor/timeline-scrub.js";

  let {
    maxFrames,
    pixelsPerFrame,
    marks,
    currentFrame,
    onScrub,
  }: {
    maxFrames: number;
    pixelsPerFrame: number;
    marks: number[];
    currentFrame: number;
    onScrub: (timelineFrame: number) => void;
  } = $props();

  let rulerEl: HTMLDivElement | undefined = $state();
  let scrubPointerId: number | null = $state(null);

  let valueNow = $derived(
    Math.min(maxFrames, Math.max(0, Math.floor(currentFrame))),
  );

  function timelineFrameFromClientX(clientX: number): number {
    if (!rulerEl) {
      return 0;
    }
    const rect = rulerEl.getBoundingClientRect();
    return timelineFrameFromPointer(
      clientX,
      rect.left,
      pixelsPerFrame,
      maxFrames,
    );
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !rulerEl) {
      return;
    }
    event.preventDefault();
    rulerEl.setPointerCapture(event.pointerId);
    scrubPointerId = event.pointerId;
    onScrub(timelineFrameFromClientX(event.clientX));
  }

  function onPointerMove(event: PointerEvent): void {
    if (scrubPointerId === null || event.pointerId !== scrubPointerId) {
      return;
    }
    onScrub(timelineFrameFromClientX(event.clientX));
  }

  function onPointerUp(event: PointerEvent): void {
    if (scrubPointerId === null || event.pointerId !== scrubPointerId) {
      return;
    }
    scrubPointerId = null;
  }
</script>

<div
  class="ruler"
  bind:this={rulerEl}
  style:width="{maxFrames * pixelsPerFrame}px"
  role="slider"
  aria-label="Timeline scrub"
  aria-valuemin={0}
  aria-valuemax={maxFrames}
  aria-valuenow={valueNow}
  tabindex="0"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
>
  {#each marks as mark (mark)}
    <div class="ruler__tick" style:left="{mark * pixelsPerFrame}px">
      <span>{mark}f</span>
    </div>
  {/each}
</div>

<style>
  .ruler {
    position: relative;
    height: 1.5rem;
    margin-left: 3rem;
    border-bottom: 1px solid #c5cbd3;
    background: #e8ebef;
    cursor: ew-resize;
    touch-action: none;
    user-select: none;
  }

  .ruler__tick {
    position: absolute;
    top: 0;
    bottom: 0;
    border-left: 1px solid #a8b0ba;
    padding-left: 0.25rem;
    font-size: 0.65rem;
    color: #5f6b76;
    line-height: 1.5rem;
    white-space: nowrap;
    pointer-events: none;
  }
</style>
