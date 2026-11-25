<script lang="ts">
  import { onMount } from "svelte";
  import { MainAction } from "#lib/editor/MainAction.svelte.js";
  import { MainStore } from "#lib/editor/MainStore.svelte.js";
  import {
    PLAYHEAD_FPS,
    playheadToTimelineFrames,
    projectFps,
    timelineFramesToPlayhead,
  } from "#lib/editor/fps.js";
  import {
    FILE_MENU_ITEMS,
    FILE_MENU_LABEL,
    resolveFileMenuAction,
    type FileMenuItemId,
  } from "#lib/editor/file-menu.js";
  import { installNativeAppMenu } from "#lib/editor/install-native-menu.js";
  import { detectMenuSurface } from "#lib/editor/menu-surface.js";
  import { maxPlayheadFrames } from "#lib/editor/playhead.js";
  import { resolveTransportHotkey } from "#lib/editor/transport-hotkeys.js";
  import EditorMenuBar from "./EditorMenuBar.svelte";
  import EditorShell from "./EditorShell.svelte";
  import PreviewPane from "./PreviewPane.svelte";
  import PreviewTransport from "./PreviewTransport.svelte";
  import PropertiesPane from "./PropertiesPane.svelte";
  import {
    buildPropertiesPanel,
    channelForPropertiesPanel,
    propertiesPanelHandlersFromAction,
  } from "./properties-panel.js";
  import Timeline from "./Timeline.svelte";
  import { timelineActionsFromApp } from "./timeline-actions.js";

  const store = new MainStore();
  const action = new MainAction(store);
  const menuSurface = detectMenuSurface();
  const showWebMenu = menuSurface === "web";
  const propertyHandlers = propertiesPanelHandlersFromAction(action);
  const fileMenuActions = {
    export: () => action.exportProject(),
  };

  function onFileMenuSelect(item: { id: string; text: string }): void {
    resolveFileMenuAction(item.id as FileMenuItemId, fileMenuActions)();
  }

  let timelineFps = $derived(projectFps(store.project.info));
  let playheadTimelineFrame = $derived(
    playheadToTimelineFrames(store.playheadFrame, timelineFps),
  );
  let propertiesPanel = $derived(buildPropertiesPanel(store));
  let maxFrame = $derived(maxPlayheadFrames(store.project));
  let playing = $derived(store.playing);
  let seekFrame = $derived.by(() => {
    const frame = store.playheadFrame;
    if (!playing) {
      return frame;
    }
    return Math.floor(frame / PLAYHEAD_FPS) * PLAYHEAD_FPS;
  });
  let seekStep = $derived(playing ? PLAYHEAD_FPS : 1);
  let transportLabel = $derived(playing ? "Stop" : "Play");

  let timelineActions = $derived(
    timelineActionsFromApp(store, action, (timelineFrame) => {
      action.seek(timelineFramesToPlayhead(timelineFrame, timelineFps));
    }),
  );

  onMount(() => {
    if (menuSurface !== "native") {
      return;
    }
    void installNativeAppMenu(fileMenuActions);
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

<EditorShell {showWebMenu}>
  {#snippet menu()}
    <EditorMenuBar
      label={FILE_MENU_LABEL}
      items={[...FILE_MENU_ITEMS]}
      onSelect={onFileMenuSelect}
    />
  {/snippet}
  {#snippet preview()}
    <PreviewPane {store}>
      {#snippet transport()}
        <PreviewTransport
          {playing}
          {seekFrame}
          {maxFrame}
          {seekStep}
          {transportLabel}
          frameLabel={playing ? null : store.playheadFrame}
          onTogglePlay={() => action.togglePlay()}
          onSeek={(value) => action.seek(value)}
        />
      {/snippet}
    </PreviewPane>
  {/snippet}
  {#snippet properties()}
    <PropertiesPane
      panel={propertiesPanel}
      getChannel={(id) => channelForPropertiesPanel(store, id)}
      handlers={propertyHandlers}
    />
  {/snippet}
  {#snippet timeline()}
    <Timeline
      tracks={store.project.tracks}
      selection={store.selection}
      {playheadTimelineFrame}
      actions={timelineActions}
    />
  {/snippet}
</EditorShell>
