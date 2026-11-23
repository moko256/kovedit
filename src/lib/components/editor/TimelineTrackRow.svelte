<script lang="ts">
  import type { MainAction } from "#lib/editor/MainAction.svelte.js";
  import type { MainStore } from "#lib/editor/MainStore.svelte.js";
  import { layoutTrack } from "#lib/editor/track-layout.js";
  import { isClipNode, isSpaceNode, type Track } from "#lib/editor/types.js";
  import TimelineClip from "./TimelineClip.svelte";
  import TimelineSpace from "./TimelineSpace.svelte";

  let {
    track,
    trackIndex,
    maxFrames,
    pixelsPerFrame,
    store,
    action,
  }: {
    track: Track;
    trackIndex: number;
    maxFrames: number;
    pixelsPerFrame: number;
    store: MainStore;
    action: MainAction;
  } = $props();

  let layout = $derived(layoutTrack(track.items));
  let empty = $derived(track.items.length === 0);
  let selection = $derived(store.selection);

  let menu: {
    open: boolean;
    x: number;
    y: number;
    frame: number;
  } = $state({ open: false, x: 0, y: 0, frame: 0 });

  let videoInput: HTMLInputElement | undefined = $state();
  let audioInput: HTMLInputElement | undefined = $state();
  let pendingPickFrame = $state(0);

  function frameFromClientX(el: HTMLElement, clientX: number): number {
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.floor((clientX - rect.left) / pixelsPerFrame));
  }

  function closeMenu(): void {
    menu = { ...menu, open: false };
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  async function onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    closeMenu();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) {
      return;
    }
    const el = event.currentTarget as HTMLElement;
    const frame = frameFromClientX(el, event.clientX);
    for (const file of files) {
      if (file.type.startsWith("video/")) {
        await action.dropVideoFile(file, trackIndex, frame);
        continue;
      }
      if (file.type.startsWith("audio/")) {
        await action.dropAudioFile(file, trackIndex, frame);
      }
    }
  }

  function onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    const el = event.currentTarget as HTMLElement;
    const frame = frameFromClientX(el, event.clientX);
    menu = {
      open: true,
      x: event.clientX,
      y: event.clientY,
      frame,
    };
  }

  function pickVideo(): void {
    pendingPickFrame = menu.frame;
    closeMenu();
    videoInput?.click();
  }

  function pickAudio(): void {
    pendingPickFrame = menu.frame;
    closeMenu();
    audioInput?.click();
  }

  function insertText(): void {
    const frame = menu.frame;
    closeMenu();
    action.insertTextObject(trackIndex, frame);
  }

  async function onVideoPicked(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) {
      return;
    }
    await action.dropVideoFile(file, trackIndex, pendingPickFrame);
  }

  async function onAudioPicked(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) {
      return;
    }
    await action.dropAudioFile(file, trackIndex, pendingPickFrame);
  }

  function isClipSelected(itemIndex: number): boolean {
    return (
      selection !== null &&
      selection.type === "clip" &&
      selection.trackIndex === trackIndex &&
      selection.itemIndex === itemIndex
    );
  }

  let trackSelected = $derived(
    selection !== null &&
      selection.type === "track" &&
      selection.trackIndex === trackIndex,
  );

  function onSelectTrack(): void {
    action.selectTrack(trackIndex);
  }
</script>

<svelte:window
  onclick={() => {
    if (menu.open) {
      closeMenu();
    }
  }}
  onkeydown={(event) => {
    if (event.key === "Escape" && menu.open) {
      closeMenu();
    }
  }}
/>

<div class="track-row">
  <button
    type="button"
    class={[
      "track-row__label",
      { "track-row__label--selected": trackSelected },
    ]}
    aria-label="Select track {trackIndex + 1}"
    aria-pressed={trackSelected}
    onclick={onSelectTrack}
  >
    T{trackIndex + 1}
  </button>
  <div class="track-row__body">
    <div
      class="track-row__content"
      role="region"
      aria-label="Track {trackIndex + 1}"
      style:width="{maxFrames * pixelsPerFrame}px"
      ondragover={onDragOver}
      ondrop={onDrop}
      oncontextmenu={onContextMenu}
    >
      {#if empty}
        <p class="track-row__drop-hint">
          Drop video/audio or right-click to insert
        </p>
      {/if}
      {#each layout as entry (entry.itemIndex)}
        {@const item = track.items[entry.itemIndex]}
        {#if isSpaceNode(item)}
          <TimelineSpace lengthFrames={entry.lengthFrames} {pixelsPerFrame} />
        {:else if isClipNode(item)}
          <TimelineClip
            clip={item}
            {trackIndex}
            itemIndex={entry.itemIndex}
            startFrame={entry.startFrame}
            lengthFrames={entry.lengthFrames}
            selected={isClipSelected(entry.itemIndex)}
            {pixelsPerFrame}
            {store}
            {action}
          />
        {/if}
      {/each}
    </div>
  </div>
</div>

<input
  bind:this={videoInput}
  class="track-row__file"
  type="file"
  accept="video/*"
  aria-hidden="true"
  tabindex="-1"
  onchange={onVideoPicked}
/>
<input
  bind:this={audioInput}
  class="track-row__file"
  type="file"
  accept="audio/*"
  aria-hidden="true"
  tabindex="-1"
  onchange={onAudioPicked}
/>

{#if menu.open}
  <div
    class="track-row__menu"
    style:left="{menu.x}px"
    style:top="{menu.y}px"
    role="menu"
    tabindex="-1"
    onpointerdown={(event) => event.stopPropagation()}
  >
    <button type="button" role="menuitem" onclick={pickVideo}>
      Insert video…
    </button>
    <button type="button" role="menuitem" onclick={pickAudio}>
      Insert audio…
    </button>
    <button type="button" role="menuitem" onclick={insertText}>
      Insert text
    </button>
  </div>
{/if}

<style>
  .track-row {
    display: grid;
    grid-template-columns: 3rem auto;
    align-items: stretch;
    min-height: 3rem;
    width: max-content;
  }

  .track-row__label {
    display: grid;
    place-items: center;
    margin: 0;
    padding: 0;
    border: 0;
    border-right: 1px solid #c5cbd3;
    font: inherit;
    font-size: 0.7rem;
    font-weight: 700;
    color: #52606d;
    background: #dde2e8;
    cursor: pointer;
  }

  .track-row__label--selected {
    color: #1f2933;
    background: #c8d0da;
  }

  .track-row__body {
    background: #f7f8fa;
  }

  .track-row__content {
    position: relative;
    display: flex;
    align-items: stretch;
    min-height: 3rem;
  }

  .track-row__drop-hint {
    position: absolute;
    inset: 0;
    margin: 0;
    display: grid;
    place-items: center;
    color: #8a93a0;
    font-size: 0.8rem;
    pointer-events: none;
  }

  .track-row__file {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .track-row__menu {
    position: fixed;
    z-index: 40;
    display: flex;
    flex-direction: column;
    min-width: 10rem;
    padding: 0.25rem;
    border: 1px solid #c5cbd3;
    border-radius: 4px;
    background: #f7f8fa;
    box-shadow: 0 8px 20px rgb(15 26 34 / 18%);
  }

  .track-row__menu button {
    margin: 0;
    padding: 0.4rem 0.55rem;
    border: 0;
    border-radius: 3px;
    background: transparent;
    color: #1f2933;
    font: inherit;
    font-size: 0.8rem;
    text-align: left;
    cursor: pointer;
  }

  .track-row__menu button:hover {
    background: #e2e8f0;
  }
</style>
