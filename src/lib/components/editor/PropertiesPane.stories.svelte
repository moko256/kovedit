<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import PropertiesPane from "./PropertiesPane.svelte";
  import { noopPropertyHandlers, storyClipPanel } from "./story-fixtures.js";

  const { Story } = defineMeta({
    title: "Editor/PropertiesPane",
    component: PropertiesPane,
  });
</script>

<script lang="ts">
  const { panel, getChannel } = storyClipPanel();
  const handlers = noopPropertyHandlers();
</script>

<Story name="ClipSelected">
  <div
    style="height: 28rem; width: 22rem; background: #d8dde4; padding: 0.5rem;"
  >
    <PropertiesPane {panel} {getChannel} {handlers} />
  </div>
</Story>

<Story name="Empty">
  <div
    style="height: 16rem; width: 22rem; background: #d8dde4; padding: 0.5rem;"
  >
    <PropertiesPane panel={null} getChannel={() => null} {handlers} />
  </div>
</Story>
