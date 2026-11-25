<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import EditorMenuBar from "./EditorMenuBar.svelte";

  const { Story } = defineMeta({
    title: "Editor/MenuBar",
    component: EditorMenuBar,
  });
</script>

<Story name="FileMenu">
  <div style="padding: 1rem; background: #d8dde4;">
    <EditorMenuBar
      label="ファイル"
      items={[
        { id: "file-open", text: "開く" },
        { id: "file-save", text: "保存" },
        { id: "file-export", text: "エクスポート" },
      ]}
    />
  </div>
</Story>
