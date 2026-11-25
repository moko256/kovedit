<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    showWebMenu = false,
    menu,
    preview,
    properties,
    timeline,
  }: {
    showWebMenu?: boolean;
    menu?: Snippet;
    preview: Snippet;
    properties: Snippet;
    timeline: Snippet;
  } = $props();
</script>

<div class={["editor-shell", showWebMenu && "editor-shell--with-menu"]}>
  {#if showWebMenu && menu}
    {@render menu()}
  {/if}
  <div class="editor-shell__workspace">
    <div class="editor-shell__top">
      {@render preview()}
      {@render properties()}
    </div>
    <div class="editor-shell__bottom">
      {@render timeline()}
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
