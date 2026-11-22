<script lang="ts">
  import type { MainAction } from "#lib/editor/MainAction.svelte.js";
  import type { MainStore } from "#lib/editor/MainStore.svelte.js";
  import { maxPlayheadFrames } from "#lib/editor/playhead.js";

  let { store, action }: { store: MainStore; action: MainAction } = $props();

  let maxFrame = $derived(maxPlayheadFrames(store.project));
  let playing = $derived(store.playing);
  let playheadFrame = $derived(store.playheadFrame);

  function onSeekInput(event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    action.seek(Number(target.value));
  }
</script>

<div class="transport">
  <button
    type="button"
    class="transport__button"
    onclick={() => action.togglePlay()}
    aria-label={playing ? "Stop" : "Play"}
  >
    {playing ? "Stop" : "Play"}
  </button>
  <input
    class="transport__seek"
    type="range"
    min="0"
    max={Math.max(0, maxFrame)}
    step="1"
    value={playheadFrame}
    oninput={onSeekInput}
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
    border-top: 1px solid #c5cbd3;
    background: #e2e6eb;
  }

  .transport__button {
    min-width: 3.5rem;
    padding: 0.3rem 0.65rem;
    border: 1px solid #9aa3ad;
    border-radius: 0.25rem;
    background: #f7f8fa;
    color: #1f2933;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }

  .transport__button:hover {
    background: #ffffff;
  }

  .transport__seek {
    width: 100%;
    accent-color: #2f6fed;
  }

  .transport__frame {
    min-width: 3.5rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 0.8rem;
    color: #3e4c59;
  }
</style>
