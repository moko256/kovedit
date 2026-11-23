<script lang="ts">
  import { Separator } from "#lib/components/ui/separator/index.js";
  import type { MainAction } from "#lib/editor/MainAction.svelte.js";
  import type { MainStore } from "#lib/editor/MainStore.svelte.js";
  import { playheadToTimelineFrames, projectFps } from "#lib/editor/fps.js";
  import { totalTrackFrames } from "#lib/editor/track-layout.js";
  import {
    MIN_TRACK_FRAMES,
    PIXELS_PER_FRAME,
    RULER_STEP,
  } from "./timelineConstants";
  import TimelinePlayhead from "./TimelinePlayhead.svelte";
  import TimelineRuler from "./TimelineRuler.svelte";
  import TimelineTrackRow from "./TimelineTrackRow.svelte";

  let { store, action }: { store: MainStore; action: MainAction } = $props();

  let tracks = $derived(store.project.tracks);

  let maxFrames = $derived.by(() => {
    let max = MIN_TRACK_FRAMES;
    for (const track of tracks) {
      max = Math.max(max, totalTrackFrames(track.items) + 60);
    }
    return max;
  });

  let rulerMarks = $derived.by(() => {
    const marks: number[] = [];
    for (let frame = 0; frame <= maxFrames; frame += RULER_STEP) {
      marks.push(frame);
    }
    return marks;
  });

  let playheadTimelineFrame = $derived(
    playheadToTimelineFrames(
      store.playheadFrame,
      projectFps(store.project.info),
    ),
  );

  let scrollEl: HTMLDivElement | undefined = $state();
  let canvasEl: HTMLDivElement | undefined = $state();
  let trackEl: HTMLDivElement | undefined = $state();
  let contentWidth = $state(0);
  let viewportWidth = $state(0);
  let scrollLeft = $state(0);

  let maxScroll = $derived(Math.max(0, contentWidth - viewportWidth));
  let thumbWidth = $derived.by(() => {
    if (contentWidth <= 0 || viewportWidth <= 0) {
      return 0;
    }
    if (contentWidth <= viewportWidth) {
      return viewportWidth;
    }
    return Math.max(24, (viewportWidth / contentWidth) * viewportWidth);
  });
  let thumbLeft = $derived.by(() => {
    if (maxScroll <= 0) {
      return 0;
    }
    const travel = Math.max(0, viewportWidth - thumbWidth);
    return (scrollLeft / maxScroll) * travel;
  });

  function measure(): void {
    contentWidth = canvasEl?.scrollWidth ?? 0;
    viewportWidth = scrollEl?.clientWidth ?? 0;
    scrollLeft = scrollEl?.scrollLeft ?? 0;
  }

  $effect(() => {
    const canvas = canvasEl;
    const scroll = scrollEl;
    if (!canvas || !scroll) {
      return;
    }
    measure();
    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(canvas);
    observer.observe(scroll);
    return () => observer.disconnect();
  });

  $effect(() => {
    void maxFrames;
    void tracks;
    measure();
  });

  function setScrollLeft(next: number): void {
    if (!scrollEl) {
      return;
    }
    const clamped = Math.min(maxScroll, Math.max(0, next));
    scrollEl.scrollLeft = clamped;
    scrollLeft = scrollEl.scrollLeft;
  }

  function onViewportScroll(): void {
    scrollLeft = scrollEl?.scrollLeft ?? 0;
  }

  let thumbDrag: {
    pointerId: number;
    originX: number;
    originScroll: number;
  } | null = $state(null);

  function onThumbPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    thumbDrag = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originScroll: scrollLeft,
    };
  }

  function onThumbPointerMove(event: PointerEvent): void {
    if (!thumbDrag || event.pointerId !== thumbDrag.pointerId) {
      return;
    }
    const travel = viewportWidth - thumbWidth;
    if (travel <= 0 || maxScroll <= 0) {
      return;
    }
    const delta = event.clientX - thumbDrag.originX;
    setScrollLeft(thumbDrag.originScroll + (delta / travel) * maxScroll);
  }

  function onThumbPointerUp(event: PointerEvent): void {
    if (!thumbDrag || event.pointerId !== thumbDrag.pointerId) {
      return;
    }
    thumbDrag = null;
  }

  function onTrackPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !trackEl || event.target !== trackEl) {
      return;
    }
    const travel = viewportWidth - thumbWidth;
    if (travel <= 0 || maxScroll <= 0) {
      return;
    }
    const rect = trackEl.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const nextThumbLeft = Math.min(
      travel,
      Math.max(0, clickX - thumbWidth / 2),
    );
    setScrollLeft((nextThumbLeft / travel) * maxScroll);
  }
</script>

<section class="timeline">
  <header class="timeline__header">Timeline</header>
  <Separator />
  <div
    id="timeline-scroll-viewport"
    class="timeline__scroll"
    bind:this={scrollEl}
    onscroll={onViewportScroll}
  >
    <div class="timeline__canvas" bind:this={canvasEl}>
      <TimelineRuler
        {maxFrames}
        pixelsPerFrame={PIXELS_PER_FRAME}
        marks={rulerMarks}
      />

      <div class="timeline__tracks">
        {#each tracks as track, trackIndex (trackIndex)}
          <TimelineTrackRow
            {track}
            {trackIndex}
            {maxFrames}
            pixelsPerFrame={PIXELS_PER_FRAME}
            {store}
            {action}
          />
        {/each}
      </div>

      <TimelinePlayhead
        {playheadTimelineFrame}
        pixelsPerFrame={PIXELS_PER_FRAME}
        {maxFrames}
        labelOffsetRem={3}
      />
    </div>
  </div>
  <div
    class="timeline__hscroll"
    bind:this={trackEl}
    role="scrollbar"
    aria-controls="timeline-scroll-viewport"
    aria-orientation="horizontal"
    aria-valuemin={0}
    aria-valuemax={Math.round(maxScroll)}
    aria-valuenow={Math.round(scrollLeft)}
    aria-label="Timeline horizontal scroll"
    tabindex="0"
    onpointerdown={onTrackPointerDown}
  >
    <button
      type="button"
      class="timeline__hscroll-thumb"
      tabindex="-1"
      aria-hidden="true"
      style:width="{thumbWidth}px"
      style:transform="translateX({thumbLeft}px)"
      onpointerdown={onThumbPointerDown}
      onpointermove={onThumbPointerMove}
      onpointerup={onThumbPointerUp}
      onpointercancel={onThumbPointerUp}
    ></button>
  </div>
</section>

<style>
  .timeline {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    background: #f0f2f5;
    border: 1px solid #c5cbd3;
  }

  .timeline__header {
    flex: 0 0 auto;
    padding: 0.45rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #4a5562;
    background: #e2e6eb;
  }

  .timeline__scroll {
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    overflow-x: auto;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .timeline__scroll::-webkit-scrollbar {
    height: 0;
    width: 10px;
  }

  .timeline__scroll::-webkit-scrollbar-thumb {
    background: #8a93a0;
    border-radius: 5px;
  }

  .timeline__scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .timeline__hscroll {
    position: relative;
    flex: 0 0 12px;
    min-width: 0;
    background: #dfe3e8;
    border-top: 1px solid #c5cbd3;
    cursor: pointer;
  }

  .timeline__hscroll-thumb {
    position: absolute;
    top: 2px;
    bottom: 2px;
    left: 0;
    box-sizing: border-box;
    padding: 0;
    border: 0;
    min-width: 24px;
    border-radius: 4px;
    background: #8a93a0;
    cursor: grab;
    touch-action: none;
  }

  .timeline__hscroll-thumb:active {
    cursor: grabbing;
  }

  .timeline__canvas {
    position: relative;
    width: max-content;
    min-width: 100%;
    min-height: 100%;
  }

  .timeline__tracks {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.5rem 0;
  }
</style>
