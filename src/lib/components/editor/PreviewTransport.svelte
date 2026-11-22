<script lang="ts">
  import { Button } from "#lib/components/ui/button/index.js";
  import { Separator } from "#lib/components/ui/separator/index.js";
  import { Slider } from "#lib/components/ui/slider/index.js";
  import * as Tooltip from "#lib/components/ui/tooltip/index.js";
  import type { MainAction } from "#lib/editor/MainAction.svelte.js";
  import type { MainStore } from "#lib/editor/MainStore.svelte.js";
  import { maxPlayheadFrames } from "#lib/editor/playhead.js";

  let { store, action }: { store: MainStore; action: MainAction } = $props();

  let maxFrame = $derived(maxPlayheadFrames(store.project));
  let playing = $derived(store.playing);
  let playheadFrame = $derived(store.playheadFrame);
  let transportLabel = $derived(playing ? "Stop" : "Play");
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
          onclick={() => action.togglePlay()}
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
    step={1}
    value={playheadFrame}
    onValueChange={(value) => action.seek(value)}
    aria-label="Seek"
  />
  <span class="transport__frame" aria-live="polite">{playheadFrame}f</span>
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
