<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import PreviewTransport from "./PreviewTransport.svelte";

  const { Story } = defineMeta({
    title: "Editor/PreviewTransport",
    component: PreviewTransport,
  });
</script>

<script lang="ts">
  let playing = $state(false);
  let seekFrame = $state(12);
</script>

<Story name="Idle">
  <div style="max-width: 32rem; background: #eceff3;">
    <PreviewTransport
      playing={false}
      seekFrame={12}
      maxFrame={240}
      seekStep={1}
      transportLabel="Play"
      frameLabel={12}
      onTogglePlay={() => {}}
      onSeek={() => {}}
    />
  </div>
</Story>

<Story name="Interactive">
  <div style="max-width: 32rem; background: #eceff3;">
    <PreviewTransport
      {playing}
      {seekFrame}
      maxFrame={240}
      seekStep={playing ? 30 : 1}
      transportLabel={playing ? "Stop" : "Play"}
      frameLabel={playing ? null : seekFrame}
      onTogglePlay={() => (playing = !playing)}
      onSeek={(frame) => (seekFrame = frame)}
    />
  </div>
</Story>
