<script lang="ts">
  let {
    playheadTimelineFrame,
    pixelsPerFrame,
    maxFrames,
    labelOffsetRem = 0,
  }: {
    playheadTimelineFrame: number;
    pixelsPerFrame: number;
    maxFrames: number;
    labelOffsetRem?: number;
  } = $props();

  let leftPx = $derived(
    Math.min(maxFrames, Math.max(0, playheadTimelineFrame)) * pixelsPerFrame,
  );
</script>

<div
  class="playhead"
  style:left="calc({labelOffsetRem}rem + {leftPx}px)"
  aria-hidden="true"
></div>

<style>
  .playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: #d64545;
    pointer-events: none;
    z-index: 5;
  }
</style>
