<script lang="ts">
  import * as Menubar from "#lib/components/ui/menubar/index.js";
  import {
    FILE_MENU_ITEMS,
    FILE_MENU_LABEL,
    resolveFileMenuAction,
    type FileMenuActions,
  } from "#lib/editor/file-menu.js";

  let { actions = {} }: { actions?: FileMenuActions } = $props();
</script>

<div class="editor-menu-bar">
  <Menubar.Root aria-label="Editor menu" class="editor-menu-bar__menubar">
    <Menubar.Menu>
      <Menubar.Trigger>{FILE_MENU_LABEL}</Menubar.Trigger>
      <Menubar.Content>
        {#each FILE_MENU_ITEMS as item (item.id)}
          <Menubar.Item onclick={resolveFileMenuAction(item.id, actions)}
            >{item.text}</Menubar.Item
          >
        {/each}
      </Menubar.Content>
    </Menubar.Menu>
  </Menubar.Root>
</div>

<style>
  .editor-menu-bar {
    display: flex;
    align-items: center;
    min-height: 2rem;
    min-width: 0;
  }

  :global(.editor-menu-bar__menubar) {
    width: 100%;
    border-color: color-mix(in oklab, #1f2933 18%, transparent);
    background: color-mix(in oklab, #ffffff 72%, #d8dde4);
  }
</style>
