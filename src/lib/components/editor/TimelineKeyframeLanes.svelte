<script lang="ts">
  import type { MainAction } from "#lib/editor/MainAction.svelte.js";
  import {
    KEYFRAME_CHANNEL_LABELS,
    type KeyframeTrackLane,
  } from "#lib/editor/keyframe-tracks.js";
  import {
    isEndpointKeyframeFrame,
    type PropertyChannelId,
  } from "#lib/editor/properties.js";

  let {
    lanes,
    trackIndex,
    itemIndex,
    lengthFrames,
    pixelsPerFrame,
    action,
  }: {
    lanes: KeyframeTrackLane[];
    trackIndex: number;
    itemIndex: number;
    lengthFrames: number;
    pixelsPerFrame: number;
    action: MainAction;
  } = $props();

  let drag: {
    channelId: PropertyChannelId;
    index: number;
    originFrame: number;
    pointerId: number;
    originX: number;
  } | null = $state(null);

  function selectObject(): void {
    action.selectClip({ trackIndex, itemIndex });
  }

  function onKeyframePointerDown(
    event: PointerEvent,
    channelId: PropertyChannelId,
    index: number,
    frame: number,
    fixed: boolean,
  ): void {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    selectObject();
    if (fixed) {
      return;
    }
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    action.beginKeyframeDrag();
    drag = {
      channelId,
      index,
      originFrame: frame,
      pointerId: event.pointerId,
      originX: event.clientX,
    };
  }

  function onKeyframePointerMove(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const deltaFrames = Math.round(
      (event.clientX - drag.originX) / pixelsPerFrame,
    );
    const nextFrame = drag.originFrame + deltaFrames;
    action.movePropertyKeyframeAtIndex(drag.channelId, drag.index, nextFrame);
  }

  function onKeyframePointerUp(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    action.endKeyframeDrag();
    drag = null;
  }
</script>

{#if lanes.length > 0}
  <div class="kf-lanes" data-testid="keyframe-lanes">
    {#each lanes as lane (lane.id)}
      <div
        class="kf-lane"
        style:height="{lane.heightRem}rem"
        data-channel={lane.id}
        role="group"
        aria-label={`${KEYFRAME_CHANNEL_LABELS[lane.id]} keyframes`}
      >
        <span class="kf-lane__label">{KEYFRAME_CHANNEL_LABELS[lane.id]}</span>
        <div class="kf-lane__track">
          {#each lane.channel.keyframes as keyframe, index (keyframe.frame)}
            {@const fixed = isEndpointKeyframeFrame(
              lane.channel,
              keyframe.frame,
            )}
            {@const left = Math.min(
              Math.max(0, keyframe.frame),
              Math.max(0, lengthFrames - 1),
            )}
            <button
              type="button"
              class={["kf-marker", { "kf-marker--fixed": fixed }]}
              style:left="{left * pixelsPerFrame}px"
              aria-label={`${KEYFRAME_CHANNEL_LABELS[lane.id]} keyframe at frame ${keyframe.frame}${fixed ? " (fixed)" : ""}`}
              data-keyframe-frame={keyframe.frame}
              data-fixed={fixed ? "true" : "false"}
              data-channel={lane.id}
              onclick={(event) => {
                event.stopPropagation();
                selectObject();
              }}
              onpointerdown={(event) =>
                onKeyframePointerDown(
                  event,
                  lane.id,
                  index,
                  keyframe.frame,
                  fixed,
                )}
              onpointermove={onKeyframePointerMove}
              onpointerup={onKeyframePointerUp}
              onpointercancel={onKeyframePointerUp}
            ></button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .kf-lanes {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 0.1rem;
    box-sizing: border-box;
    padding: 0.1rem 0 0.15rem;
  }

  .kf-lane {
    position: relative;
    display: block;
    border: 1px solid #c5cbd3;
    border-radius: 2px;
    background: #eef1f4;
    min-height: 1.15rem;
  }

  .kf-lane__label {
    position: absolute;
    z-index: 1;
    top: 0;
    bottom: 0;
    left: 0;
    display: grid;
    place-items: center;
    width: 1.6rem;
    border-right: 1px solid #d5dae1;
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: #52606d;
    background: rgb(226 230 235 / 92%);
    pointer-events: none;
  }

  .kf-lane__track {
    position: relative;
    width: 100%;
    height: 100%;
    min-width: 0;
  }

  .kf-marker {
    position: absolute;
    top: 50%;
    width: 0.7rem;
    height: 0.7rem;
    margin: 0;
    padding: 0;
    border: 1px solid #1f4e6b;
    border-radius: 1px;
    background: #f7fafc;
    transform: translate(-50%, -50%) rotate(45deg);
    cursor: grab;
    touch-action: none;
  }

  .kf-marker--fixed {
    background: #4f87ad;
    cursor: default;
  }

  .kf-marker:active:not(.kf-marker--fixed) {
    cursor: grabbing;
  }
</style>
