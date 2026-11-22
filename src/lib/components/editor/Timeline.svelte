<script lang="ts">
  import { ScrollArea } from "#lib/components/ui/scroll-area/index.js";
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
</script>

<section class="timeline">
  <header class="timeline__header">Timeline</header>
  <Separator />
  <ScrollArea class="timeline__scroll" orientation="both">
    <div class="timeline__canvas">
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
  </ScrollArea>
</section>

<style>
  .timeline {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
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

  :global(.timeline__scroll) {
    flex: 1 1 auto;
    min-height: 0;
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
