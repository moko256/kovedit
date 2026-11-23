<script lang="ts">
  import { Input } from "#lib/components/ui/input/index.js";
  import { ScrollArea } from "#lib/components/ui/scroll-area/index.js";
  import { Separator } from "#lib/components/ui/separator/index.js";
  import type { MainAction } from "#lib/editor/MainAction.svelte.js";
  import type { MainStore } from "#lib/editor/MainStore.svelte.js";
  import { playheadToTimelineFrames, projectFps } from "#lib/editor/fps.js";
  import {
    ANCHOR_OPTIONS,
    type Anchor,
    type Interpolation,
    type PropertyChannelId,
    type PropertySource,
    type ResolvedProperties,
    resolveProperties,
  } from "#lib/editor/properties.js";
  import { itemStartFrame } from "#lib/editor/track-layout.js";
  import {
    clipName,
    clipPath,
    clipPropertyLayer,
    isClipNode,
  } from "#lib/editor/types.js";

  let { store, action }: { store: MainStore; action: MainAction } = $props();

  type PanelModel = {
    kind: "clip" | "track";
    title: string;
    subtitle: string;
    trackIndex: number;
    itemIndex: number | null;
    frame: number;
    resolved: ResolvedProperties;
  };

  let panel = $derived.by((): PanelModel | null => {
    const selection = store.selection;
    if (!selection) {
      return null;
    }
    const track = store.project.tracks[selection.trackIndex];
    if (!track) {
      return null;
    }
    const timelineFrame = playheadToTimelineFrames(
      store.playheadFrame,
      projectFps(store.project.info),
    );

    if (selection.type === "track") {
      return {
        kind: "track",
        title: `Track V${selection.trackIndex + 1}`,
        subtitle: "Track defaults",
        trackIndex: selection.trackIndex,
        itemIndex: null,
        frame: timelineFrame,
        resolved: resolveProperties(track.properties, undefined, timelineFrame),
      };
    }

    const item = track.items[selection.itemIndex];
    if (!item || !isClipNode(item)) {
      return null;
    }
    const start = itemStartFrame(track.items, selection.itemIndex);
    const localFrame = Math.max(0, timelineFrame - start);
    return {
      kind: "clip",
      title: clipName(item),
      subtitle: clipPath(item),
      trackIndex: selection.trackIndex,
      itemIndex: selection.itemIndex,
      frame: localFrame,
      resolved: resolveProperties(
        track.properties,
        clipPropertyLayer(item),
        localFrame,
      ),
    };
  });

  let widthText = $state("");
  let heightText = $state("");
  let xText = $state("");
  let yText = $state("");
  let opacityText = $state("");
  let rotationText = $state("");

  let syncKey = $derived(
    panel
      ? [
          panel.kind,
          panel.trackIndex,
          panel.itemIndex ?? -1,
          panel.frame,
          panel.resolved.width.value,
          panel.resolved.height.value,
          panel.resolved.x.value,
          panel.resolved.y.value,
          panel.resolved.opacity.value,
          panel.resolved.rotation.value,
          panel.resolved.anchor.value,
          panel.resolved.aspectRatioLock.value,
          panel.resolved.width.source,
          panel.resolved.height.source,
          panel.resolved.x.source,
          panel.resolved.y.source,
          panel.resolved.opacity.source,
          panel.resolved.rotation.source,
          panel.resolved.anchor.source,
          panel.resolved.aspectRatioLock.source,
        ].join(":")
      : "",
  );

  $effect(() => {
    const key = syncKey;
    if (!panel || key === "") {
      widthText = "";
      heightText = "";
      xText = "";
      yText = "";
      opacityText = "";
      rotationText = "";
      return;
    }
    widthText = formatNumber(panel.resolved.width.value);
    heightText = formatNumber(panel.resolved.height.value);
    xText = formatNumber(panel.resolved.x.value);
    yText = formatNumber(panel.resolved.y.value);
    opacityText = formatNumber(panel.resolved.opacity.value);
    rotationText = formatNumber(panel.resolved.rotation.value);
  });

  function formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      return "0";
    }
    return Number.isInteger(value)
      ? String(value)
      : String(Number(value.toFixed(4)));
  }

  function parseNumber(raw: string, fallback: number): number {
    const trimmed = raw.trim();
    if (trimmed === "") {
      return fallback;
    }
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : fallback;
  }

  function sourceClass(source: PropertySource): string {
    if (!panel || panel.kind === "track") {
      return "properties-pane__value";
    }
    return source === "object"
      ? "properties-pane__value"
      : "properties-pane__value properties-pane__value--inherited";
  }

  function commitNumber(
    id: "width" | "height" | "x" | "y" | "opacity" | "rotation",
    raw: string,
  ): void {
    if (!panel) {
      return;
    }
    const fallback = panel.resolved[id].value;
    action.setPropertyValue(id, parseNumber(raw, fallback), panel.frame);
  }

  function onNumberKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    (event.currentTarget as HTMLInputElement).blur();
  }

  function onAnchorChange(event: Event): void {
    if (!panel) {
      return;
    }
    const value = (event.currentTarget as HTMLSelectElement).value as Anchor;
    action.setPropertyValue("anchor", value, panel.frame);
  }

  function onLockChange(event: Event): void {
    if (!panel) {
      return;
    }
    const checked = (event.currentTarget as HTMLInputElement).checked;
    action.setPropertyValue("aspectRatioLock", checked, panel.frame);
  }

  function onInterpolationChange(id: PropertyChannelId, event: Event): void {
    if (!panel) {
      return;
    }
    const value = (event.currentTarget as HTMLSelectElement)
      .value as Interpolation;
    action.setPropertyInterpolation(id, value);
  }

  function channelInterpolation(id: PropertyChannelId): Interpolation {
    if (!panel) {
      return "linear";
    }
    const selection = store.selection;
    if (!selection) {
      return "linear";
    }
    const track = store.project.tracks[selection.trackIndex];
    if (!track) {
      return "linear";
    }
    if (selection.type === "track") {
      return track.properties[id]?.interpolation ?? "linear";
    }
    const item = track.items[selection.itemIndex];
    if (!item || !isClipNode(item)) {
      return "linear";
    }
    const objectLayer = clipPropertyLayer(item);
    return (
      objectLayer[id]?.interpolation ??
      track.properties[id]?.interpolation ??
      "linear"
    );
  }

  const numericFields: {
    id: "width" | "height" | "x" | "y" | "opacity" | "rotation";
    label: string;
    aria: string;
    getText: () => string;
    setText: (value: string) => void;
  }[] = [
    {
      id: "width",
      label: "Width",
      aria: "Width",
      getText: () => widthText,
      setText: (value) => {
        widthText = value;
      },
    },
    {
      id: "height",
      label: "Height",
      aria: "Height",
      getText: () => heightText,
      setText: (value) => {
        heightText = value;
      },
    },
    {
      id: "x",
      label: "X",
      aria: "Position X",
      getText: () => xText,
      setText: (value) => {
        xText = value;
      },
    },
    {
      id: "y",
      label: "Y",
      aria: "Position Y",
      getText: () => yText,
      setText: (value) => {
        yText = value;
      },
    },
    {
      id: "opacity",
      label: "Opacity",
      aria: "Opacity",
      getText: () => opacityText,
      setText: (value) => {
        opacityText = value;
      },
    },
    {
      id: "rotation",
      label: "Rotation",
      aria: "Rotation",
      getText: () => rotationText,
      setText: (value) => {
        rotationText = value;
      },
    },
  ];
</script>

<section class="properties-pane">
  <header class="properties-pane__header">Properties</header>
  <Separator />
  <ScrollArea class="properties-pane__scroll" orientation="vertical">
    <div class="properties-pane__body">
      {#if panel}
        <dl class="properties-pane__list">
          <div class="properties-pane__row">
            <dt>Name</dt>
            <dd>{panel.title}</dd>
          </div>
          <div class="properties-pane__row">
            <dt>{panel.kind === "track" ? "Scope" : "Path"}</dt>
            <dd class="properties-pane__path">{panel.subtitle}</dd>
          </div>

          <div class="properties-pane__row">
            <dt>基準 (Anchor)</dt>
            <dd class={sourceClass(panel.resolved.anchor.source)}>
              <div class="properties-pane__field-row">
                <select
                  class={[
                    "properties-pane__select",
                    panel.kind === "clip" &&
                    panel.resolved.anchor.source === "track"
                      ? "properties-pane__inherited-control"
                      : "",
                  ]}
                  aria-label="Anchor"
                  data-inherited={panel.kind === "clip" &&
                  panel.resolved.anchor.source === "track"
                    ? "true"
                    : "false"}
                  value={panel.resolved.anchor.value}
                  onchange={onAnchorChange}
                >
                  {#each ANCHOR_OPTIONS as option (option)}
                    <option value={option}>{option}</option>
                  {/each}
                </select>
                <select
                  class="properties-pane__select properties-pane__select--interp"
                  aria-label="Anchor interpolation"
                  value={channelInterpolation("anchor")}
                  onchange={(event) => onInterpolationChange("anchor", event)}
                >
                  <option value="linear">linear</option>
                  <option value="hold">hold</option>
                </select>
              </div>
            </dd>
          </div>

          {#each numericFields as field (field.id)}
            <div class="properties-pane__row">
              <dt>{field.label}</dt>
              <dd class={sourceClass(panel.resolved[field.id].source)}>
                <div class="properties-pane__field-row">
                  <Input
                    id={`prop-${field.id}`}
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    spellcheck={false}
                    aria-label={field.aria}
                    data-inherited={panel.kind === "clip" &&
                    panel.resolved[field.id].source === "track"
                      ? "true"
                      : "false"}
                    class={panel.kind === "clip" &&
                    panel.resolved[field.id].source === "track"
                      ? "properties-pane__inherited-control"
                      : undefined}
                    value={field.getText()}
                    oninput={(event) =>
                      field.setText(
                        (event.currentTarget as HTMLInputElement).value,
                      )}
                    onblur={() => commitNumber(field.id, field.getText())}
                    onkeydown={onNumberKeydown}
                  />
                  <select
                    class="properties-pane__select properties-pane__select--interp"
                    aria-label={`${field.aria} interpolation`}
                    value={channelInterpolation(field.id)}
                    onchange={(event) => onInterpolationChange(field.id, event)}
                  >
                    <option value="linear">linear</option>
                    <option value="hold">hold</option>
                  </select>
                </div>
              </dd>
            </div>
          {/each}

          <div class="properties-pane__row">
            <dt>Aspect Lock</dt>
            <dd class={sourceClass(panel.resolved.aspectRatioLock.source)}>
              <div class="properties-pane__field-row">
                <label class="properties-pane__check">
                  <input
                    type="checkbox"
                    aria-label="Aspect ratio lock"
                    checked={panel.resolved.aspectRatioLock.value}
                    onchange={onLockChange}
                  />
                  Lock width/height
                </label>
                <select
                  class="properties-pane__select properties-pane__select--interp"
                  aria-label="Aspect ratio lock interpolation"
                  value={channelInterpolation("aspectRatioLock")}
                  onchange={(event) =>
                    onInterpolationChange("aspectRatioLock", event)}
                >
                  <option value="linear">linear</option>
                  <option value="hold">hold</option>
                </select>
              </div>
            </dd>
          </div>
        </dl>
      {/if}
    </div>
  </ScrollArea>
</section>

<style>
  .properties-pane {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    background: #f3f5f7;
    border: 1px solid #c5cbd3;
  }

  .properties-pane__header {
    flex: 0 0 auto;
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #4a5562;
    background: #e2e6eb;
  }

  :global(.properties-pane__scroll) {
    flex: 1 1 auto;
    min-height: 0;
  }

  .properties-pane__body {
    padding: 0.75rem;
  }

  .properties-pane__list {
    margin: 0;
    display: grid;
    gap: 0.75rem;
  }

  .properties-pane__row {
    display: grid;
    gap: 0.2rem;
  }

  .properties-pane__row dt {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #6b7380;
  }

  .properties-pane__row dd {
    margin: 0;
    font-size: 0.85rem;
    color: #1f2933;
    word-break: break-word;
  }

  .properties-pane__path {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.75rem;
    color: #52606d;
  }

  .properties-pane__value--inherited {
    color: #9aa3ad;
  }

  :global(.properties-pane__inherited-control) {
    color: #9aa3ad !important;
    border-color: #d5dae1 !important;
  }

  .properties-pane__field-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.4rem;
    align-items: center;
  }

  .properties-pane__select {
    box-sizing: border-box;
    height: 2rem;
    min-width: 0;
    border: 1px solid #c5cbd3;
    border-radius: 0.5rem;
    background: transparent;
    padding: 0 0.5rem;
    color: inherit;
    font: inherit;
  }

  .properties-pane__select--interp {
    width: 5.5rem;
  }

  .properties-pane__check {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
  }
</style>
