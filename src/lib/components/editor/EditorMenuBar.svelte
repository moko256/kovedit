<script lang="ts">
  import * as Menubar from "#lib/components/ui/menubar/index.js";

  type EditorMenuItem = {
    id: string;
    text: string;
  };

  let {
    label,
    items,
    onSelect,
  }: {
    label: string;
    items: readonly EditorMenuItem[];
    onSelect?: (item: EditorMenuItem) => void;
  } = $props();
</script>

<div class="editor-menu-bar">
  <Menubar.Root aria-label="Editor menu" class="editor-menu-bar__menubar">
    <Menubar.Menu>
      <Menubar.Trigger>{label}</Menubar.Trigger>
      <Menubar.Content>
        {#each items as item (item.id)}
          <Menubar.Item onclick={() => onSelect?.(item)}
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
