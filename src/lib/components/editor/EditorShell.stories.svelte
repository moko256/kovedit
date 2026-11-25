<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import EditorMenuBar from "./EditorMenuBar.svelte";
  import EditorShell from "./EditorShell.svelte";
  import PreviewTransport from "./PreviewTransport.svelte";

  const { Story } = defineMeta({
    title: "Editor/Shell",
    component: EditorShell,
  });
</script>

<script lang="ts">
  let playing = $state(false);
  let seekFrame = $state(24);
</script>

<Story name="Layout">
  <div style="height: 100vh;">
    <EditorShell showWebMenu={true}>
      {#snippet menu()}
        <EditorMenuBar
          label="ファイル"
          items={[
            { id: "file-open", text: "開く" },
            { id: "file-save", text: "保存" },
            { id: "file-export", text: "エクスポート" },
          ]}
        />
      {/snippet}
      {#snippet preview()}
        <section
          style="display:flex;flex-direction:column;min-height:0;background:#eceff3;border:1px solid #c5cbd3;"
        >
          <header
            style="padding:0.5rem 0.75rem;font-size:0.75rem;font-weight:600;text-transform:uppercase;color:#4a5562;background:#e2e6eb;"
          >
            Preview
          </header>
          <div
            style="flex:1;display:grid;place-items:center;color:#7a8490;background:linear-gradient(180deg,#f7f8fa 0%,#e8ebf0 100%);"
          >
            Preview stage
          </div>
          <PreviewTransport
            {playing}
            {seekFrame}
            maxFrame={240}
            seekStep={1}
            transportLabel={playing ? "Stop" : "Play"}
            frameLabel={playing ? null : seekFrame}
            onTogglePlay={() => (playing = !playing)}
            onSeek={(frame) => (seekFrame = frame)}
          />
        </section>
      {/snippet}
      {#snippet properties()}
        <section
          style="min-height:0;background:#f3f5f7;border:1px solid #c5cbd3;padding:0.75rem;color:#52606d;font-size:0.85rem;"
        >
          Properties pane
        </section>
      {/snippet}
      {#snippet timeline()}
        <section
          style="flex:1;min-height:0;background:#f0f2f5;border:1px solid #c5cbd3;padding:0.75rem;color:#52606d;font-size:0.85rem;"
        >
          Timeline pane
        </section>
      {/snippet}
    </EditorShell>
  </div>
</Story>
