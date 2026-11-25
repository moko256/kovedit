<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import Timeline from "./Timeline.svelte";
  import { noopTimelineActions, storyTracks } from "./story-fixtures.js";

  const { Story } = defineMeta({
    title: "Editor/Timeline",
    component: Timeline,
  });
</script>

<script lang="ts">
  import type { EditorSelection } from "#lib/editor/types.js";

  let playheadTimelineFrame = $state(36);
  let selection = $state<EditorSelection | null>({
    type: "clip",
    trackIndex: 0,
    itemIndex: 0,
  });
  const tracks = storyTracks();
  const actions = noopTimelineActions({
    seekFromTimelineFrame: (frame) => {
      playheadTimelineFrame = frame;
    },
    selectTrack: (trackIndex) => {
      selection = { type: "track", trackIndex };
    },
    selectClip: (next) => {
      selection = { type: "clip", ...next };
    },
  });
</script>

<Story name="WithClips">
  <div style="height: 20rem; padding: 0.5rem; background: #d8dde4;">
    <Timeline {tracks} {selection} {playheadTimelineFrame} {actions} />
  </div>
</Story>
