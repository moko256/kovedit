<script lang="ts">
  import { MainAction } from "$lib/editor/MainAction.svelte";
  import { MainStore } from "$lib/editor/MainStore.svelte";
  import PreviewPane from "./PreviewPane.svelte";
  import PropertiesPane from "./PropertiesPane.svelte";
  import Timeline from "./Timeline.svelte";

  const store = new MainStore();
  const action = new MainAction(store);
</script>

<div class="editor-shell">
  <div class="editor-shell__top">
    <PreviewPane {store} />
    <PropertiesPane {store} />
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
    height: 100vh;
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
  }

  .editor-shell__bottom {
    min-height: 0;
  }

  :global(html),
  :global(body) {
    margin: 0;
    height: 100%;
    background: #d8dde4;
  }
</style>
