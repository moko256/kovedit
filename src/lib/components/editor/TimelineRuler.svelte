<script lang="ts">
  let {
    maxFrames,
    pixelsPerFrame,
    marks,
  }: {
    maxFrames: number;
    pixelsPerFrame: number;
    marks: number[];
  } = $props();
</script>

<div class="ruler" style:width="{maxFrames * pixelsPerFrame}px">
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
  }
</style>
