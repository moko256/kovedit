<script lang="ts">
  let {
    lengthFrames,
    pixelsPerFrame,
  }: {
    lengthFrames: number;
    pixelsPerFrame: number;
  } = $props();
</script>

<div
  class="space"
  style:width="{Math.max(lengthFrames, 0) * pixelsPerFrame}px"
></div>

<style>
  .space {
    flex: 0 0 auto;
    height: 2.5rem;
    margin-block: 0.25rem;
  }
</style>
