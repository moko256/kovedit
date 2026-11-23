<script lang="ts">
  import { MainAction } from "#lib/editor/MainAction.svelte.js";
  import { MainStore } from "#lib/editor/MainStore.svelte.js";
  import PreviewPane from "./PreviewPane.svelte";
  import PropertiesPane from "./PropertiesPane.svelte";
  import Timeline from "./Timeline.svelte";

  const store = new MainStore();
  const action = new MainAction(store);

  function isTextEntryTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    if (target.isContentEditable) {
      return true;
    }
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  function isTransportSeekTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) {
      return false;
    }
    return target.closest('[role="slider"][aria-label="Seek"]') !== null;
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.metaKey || event.altKey) {
      return;
    }

    if (event.ctrlKey) {
      const key = event.key.toLowerCase();
      if (key !== "z") {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) {
        action.redo();
        return;
      }
      action.undo();
      return;
    }

    if (event.shiftKey) {
      return;
    }

    if (isTextEntryTarget(event.target)) {
      return;
    }

    if (event.key === " ") {
      event.preventDefault();
      action.togglePlay();
      return;
    }

    if (isTransportSeekTarget(event.target)) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      action.nudgePlayhead(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      action.nudgePlayhead(1);
    }
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<div class="editor-shell">
  <div class="editor-shell__top">
    <PreviewPane {store} {action} />
    <PropertiesPane {store} {action} />
  </div>
  <div class="editor-shell__bottom">
    <Timeline {store} {action} />
  </div>
</div>

<style>
  .editor-shell {
    box-sizing: border-box;
    display: grid;
    grid-template-rows: 1fr 40%;
    gap: 0.5rem;
    width: 100%;
    max-width: 100%;
    height: 100vh;
    overflow: hidden;
    padding: 0.5rem;
    background: #d8dde4;
    color: #1f2933;
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  }

  .editor-shell__top {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 0.5rem;
    min-height: 0;
    min-width: 0;
  }

  .editor-shell__bottom {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  :global(html),
  :global(body) {
    margin: 0;
    height: 100%;
    overflow: hidden;
    background: #d8dde4;
  }
</style>
