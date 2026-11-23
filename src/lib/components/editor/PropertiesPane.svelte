<script lang="ts">
  import { Input } from "#lib/components/ui/input/index.js";
  import { Label } from "#lib/components/ui/label/index.js";
  import { ScrollArea } from "#lib/components/ui/scroll-area/index.js";
  import { Separator } from "#lib/components/ui/separator/index.js";
  import type { MainAction } from "#lib/editor/MainAction.svelte.js";
  import type { MainStore } from "#lib/editor/MainStore.svelte.js";
  import {
    clipCenter,
    clipName,
    clipPath,
    isClipNode,
  } from "#lib/editor/types.js";

  let { store, action }: { store: MainStore; action: MainAction } = $props();

  let selected = $derived.by(() => {
    const selection = store.selection;
    if (!selection) {
      return null;
    }
    const track = store.project.tracks[selection.trackIndex];
    if (!track) {
      return null;
    }
    const item = track.items[selection.itemIndex];
    if (!item || !isClipNode(item)) {
      return null;
    }
    const center = clipCenter(item);
    return {
      name: clipName(item),
      path: clipPath(item),
      trackIndex: selection.trackIndex,
      itemIndex: selection.itemIndex,
      centerX: center.x,
      centerY: center.y,
    };
  });

  let centerXText = $state("");
  let centerYText = $state("");

  let centerSyncKey = $derived(
    selected
      ? `${selected.trackIndex}:${selected.itemIndex}:${selected.centerX}:${selected.centerY}`
      : "",
  );

  $effect(() => {
    const key = centerSyncKey;
    if (!selected || key === "") {
      centerXText = "";
      centerYText = "";
      return;
    }
    centerXText = String(selected.centerX);
    centerYText = String(selected.centerY);
  });

  function parseCoordinate(raw: string, fallback: number): number {
    const trimmed = raw.trim();
    if (trimmed === "") {
      return fallback;
    }
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : fallback;
  }

  function commitCenter(): void {
    if (!selected) {
      return;
    }
    action.setClipCenter({
      x: parseCoordinate(centerXText, selected.centerX),
      y: parseCoordinate(centerYText, selected.centerY),
    });
  }

  function onCenterKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    commitCenter();
    (event.currentTarget as HTMLInputElement).blur();
  }
</script>

<section class="properties-pane">
  <header class="properties-pane__header">Properties</header>
  <Separator />
  <ScrollArea class="properties-pane__scroll" orientation="vertical">
    <div class="properties-pane__body">
      {#if selected}
        <dl class="properties-pane__list">
          <div class="properties-pane__row">
            <dt>Name</dt>
            <dd>{selected.name}</dd>
          </div>
          <div class="properties-pane__row">
            <dt>Path</dt>
            <dd class="properties-pane__path">{selected.path}</dd>
          </div>
          <div class="properties-pane__row">
            <dt>Center</dt>
            <dd class="properties-pane__center">
              <div class="properties-pane__field">
                <Label for="clip-center-x">X</Label>
                <Input
                  id="clip-center-x"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  spellcheck={false}
                  aria-label="Center X"
                  bind:value={centerXText}
                  onblur={commitCenter}
                  onkeydown={onCenterKeydown}
                />
              </div>
              <div class="properties-pane__field">
                <Label for="clip-center-y">Y</Label>
                <Input
                  id="clip-center-y"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  spellcheck={false}
                  aria-label="Center Y"
                  bind:value={centerYText}
                  onblur={commitCenter}
                  onkeydown={onCenterKeydown}
                />
              </div>
            </dd>
          </div>
        </dl>
      {/if}
    </div>
  </ScrollArea>
</section>

<style>
  .properties-pane {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    background: #f3f5f7;
    border: 1px solid #c5cbd3;
  }

  .properties-pane__header {
    flex: 0 0 auto;
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #4a5562;
    background: #e2e6eb;
  }

  :global(.properties-pane__scroll) {
    flex: 1 1 auto;
    min-height: 0;
  }

  .properties-pane__body {
    padding: 0.75rem;
  }

  .properties-pane__list {
    margin: 0;
    display: grid;
    gap: 0.75rem;
  }

  .properties-pane__row {
    display: grid;
    gap: 0.2rem;
  }

  .properties-pane__row dt {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #6b7380;
  }

  .properties-pane__row dd {
    margin: 0;
    font-size: 0.85rem;
    color: #1f2933;
    word-break: break-word;
  }

  .properties-pane__path {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.75rem;
    color: #52606d;
  }

  .properties-pane__center {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .properties-pane__field {
    display: grid;
    gap: 0.25rem;
  }
</style>
