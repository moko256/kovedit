<script lang="ts">
  import * as Menubar from "#lib/components/ui/menubar/index.js";

  function noop(): void {}
</script>

<div class="editor-menu-bar">
  <Menubar.Root aria-label="Editor menu" class="editor-menu-bar__menubar">
    <Menubar.Menu>
      <Menubar.Trigger>ファイル</Menubar.Trigger>
      <Menubar.Content>
        <Menubar.Item onclick={noop}>開く</Menubar.Item>
        <Menubar.Item onclick={noop}>保存</Menubar.Item>
        <Menubar.Item onclick={noop}>エクスポート</Menubar.Item>
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
