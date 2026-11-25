<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import TimelineClip from "./TimelineClip.svelte";
  import {
    noopTimelineActions,
    storyTextClip,
    storyVideoClip,
  } from "./story-fixtures.js";

  const { Story } = defineMeta({
    title: "Editor/TimelineClip",
    component: TimelineClip,
  });
</script>

<script lang="ts">
  const actions = noopTimelineActions();
</script>

<Story name="Variants">
  <div
    style="display:flex;gap:0.75rem;padding:1rem;background:#f7f8fa;align-items:flex-start;"
  >
    <div style="width: 10rem;">
      <TimelineClip
        clip={storyVideoClip()}
        trackIndex={0}
        itemIndex={0}
        startFrame={0}
        selected={true}
        pixelsPerFrame={2}
        {actions}
      />
    </div>
    <div style="width: 8rem;">
      <TimelineClip
        clip={storyTextClip()}
        trackIndex={0}
        itemIndex={1}
        startFrame={140}
        selected={false}
        pixelsPerFrame={2}
        {actions}
      />
    </div>
  </div>
</Story>
