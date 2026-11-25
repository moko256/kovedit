<script lang="ts">
  import { Button } from "#lib/components/ui/button/index.js";
  import { Separator } from "#lib/components/ui/separator/index.js";
  import { Slider } from "#lib/components/ui/slider/index.js";
  import * as Tooltip from "#lib/components/ui/tooltip/index.js";

  let {
    playing,
    seekFrame,
    maxFrame,
    seekStep,
    transportLabel,
    frameLabel = null,
    onTogglePlay,
    onSeek,
  }: {
    playing: boolean;
    seekFrame: number;
    maxFrame: number;
    seekStep: number;
    transportLabel: string;
    frameLabel?: number | null;
    onTogglePlay: () => void;
    onSeek: (frame: number) => void;
  } = $props();
</script>

<Separator />
<div class="transport">
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="outline"
          size="sm"
          class="transport__button min-w-14"
          aria-label={transportLabel}
          onclick={onTogglePlay}
        >
          {transportLabel}
        </Button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>
      {playing ? "Stop playback" : "Play preview"}
    </Tooltip.Content>
  </Tooltip.Root>
  <Slider
    type="single"
    class="transport__seek"
    min={0}
    max={Math.max(0, maxFrame)}
    step={seekStep}
    value={seekFrame}
    onValueChange={onSeek}
    aria-label="Seek"
  />
  {#if frameLabel === null}
    <span class="transport__frame" aria-hidden="true"></span>
  {:else}
    <span class="transport__frame" aria-live="polite">{frameLabel}f</span>
  {/if}
</div>

<style>
  .transport {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.65rem;
    align-items: center;
    flex: 0 0 auto;
    padding: 0.45rem 0.75rem;
    background: #e2e6eb;
  }

  .transport__frame {
    min-width: 3.5rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 0.8rem;
    color: #3e4c59;
  }
</style>
