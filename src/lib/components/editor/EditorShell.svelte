<script lang="ts">
  import { onMount } from "svelte";
  import { MainAction } from "#lib/editor/MainAction.svelte.js";
  import { MainStore } from "#lib/editor/MainStore.svelte.js";
  import { installNativeAppMenu } from "#lib/editor/install-native-menu.js";
  import { detectMenuSurface } from "#lib/editor/menu-surface.js";
  import { resolveTransportHotkey } from "#lib/editor/transport-hotkeys.js";
  import EditorMenuBar from "./EditorMenuBar.svelte";
  import PreviewPane from "./PreviewPane.svelte";
  import PropertiesPane from "./PropertiesPane.svelte";
  import Timeline from "./Timeline.svelte";

  const store = new MainStore();
  const action = new MainAction(store);
  const menuSurface = detectMenuSurface();
  const showWebMenu = menuSurface === "web";

  onMount(() => {
    if (menuSurface !== "native") {
      return;
    }
    void installNativeAppMenu();
  });

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
    const hotkey = resolveTransportHotkey({
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      textEntry: isTextEntryTarget(event.target),
      transportSeek: isTransportSeekTarget(event.target),
    });

    if (hotkey.kind === "none") {
      return;
    }

    event.preventDefault();
    if (hotkey.kind === "undo") {
      action.undo();
      return;
    }
    if (hotkey.kind === "redo") {
      action.redo();
      return;
    }
    if (hotkey.kind === "togglePlay") {
      action.togglePlay();
      return;
    }
    action.nudgePlayhead(hotkey.delta);
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<div class={["editor-shell", showWebMenu && "editor-shell--with-menu"]}>
  {#if showWebMenu}
    <EditorMenuBar />
  {/if}
  <div class="editor-shell__workspace">
    <div class="editor-shell__top">
      <PreviewPane {store} {action} />
      <PropertiesPane {store} {action} />
    </div>
    <div class="editor-shell__bottom">
      <Timeline {store} {action} />
    </div>
  </div>
</div>

<style>
  .editor-shell {
    box-sizing: border-box;
    display: grid;
    grid-template-rows: 1fr;
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

  .editor-shell--with-menu {
    grid-template-rows: auto 1fr;
  }

  .editor-shell__workspace {
    display: grid;
    grid-template-rows: 1fr 40%;
    gap: 0.5rem;
    min-height: 0;
    min-width: 0;
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
