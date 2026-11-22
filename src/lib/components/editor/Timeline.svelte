<script lang="ts">
  import type { MainAction } from "$lib/editor/MainAction.svelte";
  import type { MainStore } from "$lib/editor/MainStore.svelte";
  import { layoutTrack, totalTrackFrames } from "$lib/editor/track-layout";
  import {
    clipName,
    isClipNode,
    isSpaceNode,
    type ClipNode,
  } from "$lib/editor/types";

  let { store, action }: { store: MainStore; action: MainAction } = $props();

  const PIXELS_PER_FRAME = 2;
  const MIN_TRACK_FRAMES = 300;
  const RULER_STEP = 30;

  let tracks = $derived(store.project.tracks);
  let selection = $derived(store.selection);

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

  function frameFromClientX(el: HTMLElement, clientX: number): number {
    const content = el.querySelector(".timeline__track-content");
    const target = content instanceof HTMLElement ? content : el;
    const rect = target.getBoundingClientRect();
    return Math.max(0, Math.floor((clientX - rect.left) / PIXELS_PER_FRAME));
  }

  function onTrackDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  async function onTrackDrop(
    event: DragEvent,
    trackIndex: number,
  ): Promise<void> {
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

  function isSelected(trackIndex: number, itemIndex: number): boolean {
    return (
      selection !== null &&
      selection.trackIndex === trackIndex &&
      selection.itemIndex === itemIndex
    );
  }

  let drag: {
    clip: ClipNode;
    trackIndex: number;
    originStart: number;
    pointerId: number;
    originX: number;
  } | null = $state(null);

  function onClipPointerDown(
    event: PointerEvent,
    trackIndex: number,
    itemIndex: number,
    startFrame: number,
    clip: ClipNode,
  ): void {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    action.selectClip({ trackIndex, itemIndex });
    drag = {
      clip,
      trackIndex,
      originStart: startFrame,
      pointerId: event.pointerId,
      originX: event.clientX,
    };
  }

  function onClipPointerMove(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const track = store.project.tracks[drag.trackIndex];
    if (!track) {
      return;
    }
    const itemIndex = track.items.indexOf(drag.clip);
    if (itemIndex < 0) {
      return;
    }
    const deltaFrames = Math.round(
      (event.clientX - drag.originX) / PIXELS_PER_FRAME,
    );
    const nextStart = Math.max(0, drag.originStart + deltaFrames);
    action.moveClip(drag.trackIndex, itemIndex, nextStart);
  }

  function onClipPointerUp(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    drag = null;
  }
</script>

<section class="timeline">
  <header class="timeline__header">Timeline</header>
  <div class="timeline__scroll">
    <div class="timeline__canvas">
      <div
        class="timeline__ruler"
        style:width="{maxFrames * PIXELS_PER_FRAME}px"
      >
        {#each rulerMarks as mark (mark)}
          <div class="timeline__tick" style:left="{mark * PIXELS_PER_FRAME}px">
            <span>{mark}f</span>
          </div>
        {/each}
      </div>

      <div class="timeline__tracks">
        {#each tracks as track, trackIndex (trackIndex)}
          {@const layout = layoutTrack(track.items)}
          {@const empty = track.items.length === 0}
          <div class="timeline__track-row">
            <div class="timeline__track-label">V{trackIndex + 1}</div>
            <div
              class="timeline__track-body"
              role="region"
              aria-label="Video track {trackIndex + 1}"
              ondragover={onTrackDragOver}
              ondrop={(event) => onTrackDrop(event, trackIndex)}
            >
              <div
                class="timeline__track-content"
                style:width="{maxFrames * PIXELS_PER_FRAME}px"
              >
                {#if empty}
                  <p class="timeline__drop-hint">Drop video files here</p>
                {/if}
                {#each layout as entry (entry.itemIndex)}
                  {@const item = track.items[entry.itemIndex]}
                  {#if isSpaceNode(item)}
                    <div
                      class="timeline__space"
                      style:width="{Math.max(entry.lengthFrames, 0) *
                        PIXELS_PER_FRAME}px"
                    ></div>
                  {:else if isClipNode(item)}
                    <button
                      type="button"
                      class={[
                        "timeline__clip",
                        {
                          "timeline__clip--selected": isSelected(
                            trackIndex,
                            entry.itemIndex,
                          ),
                        },
                      ]}
                      style:width="{Math.max(entry.lengthFrames, 1) *
                        PIXELS_PER_FRAME}px"
                      onclick={() =>
                        action.selectClip({
                          trackIndex,
                          itemIndex: entry.itemIndex,
                        })}
                      onpointerdown={(event) =>
                        onClipPointerDown(
                          event,
                          trackIndex,
                          entry.itemIndex,
                          entry.startFrame,
                          item,
                        )}
                      onpointermove={onClipPointerMove}
                      onpointerup={onClipPointerUp}
                      onpointercancel={onClipPointerUp}
                    >
                      <span class="timeline__clip-name">{clipName(item)}</span>
                    </button>
                  {/if}
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
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
    border-bottom: 1px solid #c5cbd3;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #4a5562;
    background: #e2e6eb;
  }

  .timeline__scroll {
    flex: 1 1 auto;
    overflow: auto;
    min-height: 0;
  }

  .timeline__canvas {
    width: max-content;
    min-width: 100%;
    min-height: 100%;
  }

  .timeline__ruler {
    position: relative;
    height: 1.5rem;
    margin-left: 3rem;
    border-bottom: 1px solid #c5cbd3;
    background: #e8ebef;
  }

  .timeline__tick {
    position: absolute;
    top: 0;
    bottom: 0;
    border-left: 1px solid #a8b0ba;
    padding-left: 0.25rem;
    font-size: 0.65rem;
    color: #5f6b76;
    line-height: 1.5rem;
    white-space: nowrap;
  }

  .timeline__tracks {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.5rem 0;
  }

  .timeline__track-row {
    display: grid;
    grid-template-columns: 3rem auto;
    align-items: stretch;
    min-height: 3rem;
    width: max-content;
  }

  .timeline__track-label {
    display: grid;
    place-items: center;
    font-size: 0.7rem;
    font-weight: 700;
    color: #52606d;
    background: #dde2e8;
    border-right: 1px solid #c5cbd3;
  }

  .timeline__track-body {
    background: #f7f8fa;
  }

  .timeline__track-content {
    position: relative;
    display: flex;
    align-items: stretch;
    min-height: 3rem;
  }

  .timeline__drop-hint {
    position: absolute;
    inset: 0;
    margin: 0;
    display: grid;
    place-items: center;
    color: #8a93a0;
    font-size: 0.8rem;
    pointer-events: none;
  }

  .timeline__space {
    flex: 0 0 auto;
    height: 2.5rem;
    margin-block: 0.25rem;
  }

  .timeline__clip {
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

  .timeline__clip:active {
    cursor: grabbing;
  }

  .timeline__clip--selected {
    outline: 2px solid #1f4e6b;
    outline-offset: 1px;
  }

  .timeline__clip-name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
