<script lang="ts">
  import { Input } from "#lib/components/ui/input/index.js";
  import { ScrollArea } from "#lib/components/ui/scroll-area/index.js";
  import { Separator } from "#lib/components/ui/separator/index.js";
  import {
    type AnimatedChannel,
    type ChannelValueMap,
    type PropertyChannelId,
  } from "#lib/editor/properties.js";
  import type {
    PropertiesPanelHandlers,
    PropertiesPanelModel,
  } from "./properties-panel.js";
  import PropertiesDrawableChannels from "./PropertiesDrawableChannels.svelte";
  import {
    DRAFT_CHANNEL_IDS,
    formatPropertyNumber,
    onPropertyNumberKeydown,
    parsePropertyNumber,
  } from "./properties-pane-helpers.js";

  let {
    panel,
    getChannel,
    handlers,
  }: {
    panel: PropertiesPanelModel | null;
    getChannel: (
      id: PropertyChannelId,
    ) => AnimatedChannel<ChannelValueMap[PropertyChannelId]> | null;
    handlers: PropertiesPanelHandlers;
  } = $props();

  let rateText = $state("");
  let textContent = $state("");
  let draftValues = $state<Record<string, string>>({});
  let draftFrames = $state<Record<string, string>>({});

  function channelFor(
    id: PropertyChannelId,
  ): AnimatedChannel<ChannelValueMap[PropertyChannelId]> | null {
    return getChannel(id);
  }

  function channelKey(id: PropertyChannelId): string {
    const channel = channelFor(id);
    if (!channel) {
      return `${id}:`;
    }
    return `${id}:${channel.keyframes.map((k) => `${k.frame}=${String(k.value)}`).join("|")}:${channel.interpolation}`;
  }

  let syncKey = $derived(
    panel
      ? [
          panel.kind,
          panel.trackIndex,
          panel.itemIndex ?? -1,
          panel.frame,
          panel.objectType ?? "",
          panel.playbackRate,
          panel.durationFrames,
          panel.text,
          channelKey("anchor"),
          channelKey("width"),
          channelKey("height"),
          channelKey("x"),
          channelKey("y"),
          channelKey("opacity"),
          channelKey("rotation"),
          channelKey("aspectRatioLock"),
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
      rateText = "";
      textContent = "";
      draftValues = {};
      draftFrames = {};
      return;
    }
    rateText = formatPropertyNumber(panel.playbackRate);
    textContent = panel.text;
    const nextValues: Record<string, string> = {};
    const nextFrames: Record<string, string> = {};
    for (const id of DRAFT_CHANNEL_IDS) {
      const channel = channelFor(id);
      if (!channel) {
        continue;
      }
      for (const keyframe of channel.keyframes) {
        const draftKey = `${id}:${keyframe.frame}`;
        nextFrames[draftKey] = String(keyframe.frame);
        if (id === "aspectRatioLock") {
          nextValues[draftKey] = keyframe.value ? "true" : "false";
        } else if (id === "anchor") {
          nextValues[draftKey] = String(keyframe.value);
        } else {
          nextValues[draftKey] = formatPropertyNumber(keyframe.value as number);
        }
      }
    }
    draftValues = nextValues;
    draftFrames = nextFrames;
  });

  function commitRate(raw: string): void {
    if (!panel || !panel.media) {
      return;
    }
    handlers.setPlaybackRate(parsePropertyNumber(raw, panel.playbackRate));
  }

  function commitText(raw: string): void {
    if (!panel || panel.objectType !== "text") {
      return;
    }
    handlers.setTextContent(raw);
  }
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

          {#if panel.kind === "clip" && panel.objectType}
            <div class="properties-pane__row">
              <dt>Type</dt>
              <dd>{panel.objectType}</dd>
            </div>
            <div class="properties-pane__row">
              <dt>Duration</dt>
              <dd>{panel.durationFrames} frames</dd>
            </div>
          {/if}

          {#if panel.kind === "clip" && panel.media}
            <div class="properties-pane__row">
              <dt>Playback Rate</dt>
              <dd>
                <Input
                  id="prop-playback-rate"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  spellcheck={false}
                  aria-label="Playback rate"
                  value={rateText}
                  oninput={(event) =>
                    (rateText = (event.currentTarget as HTMLInputElement)
                      .value)}
                  onblur={() => commitRate(rateText)}
                  onkeydown={onPropertyNumberKeydown}
                />
              </dd>
            </div>
          {/if}

          {#if panel.kind === "clip" && panel.objectType === "text"}
            <div class="properties-pane__row">
              <dt>Text</dt>
              <dd>
                <Input
                  id="prop-text"
                  type="text"
                  autocomplete="off"
                  spellcheck={false}
                  aria-label="Text content"
                  value={textContent}
                  oninput={(event) =>
                    (textContent = (event.currentTarget as HTMLInputElement)
                      .value)}
                  onblur={() => commitText(textContent)}
                  onkeydown={onPropertyNumberKeydown}
                />
              </dd>
            </div>
          {/if}

          {#if panel.drawable}
            <PropertiesDrawableChannels
              {panel}
              {getChannel}
              {handlers}
              bind:draftValues
              bind:draftFrames
            />
          {/if}
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
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
</style>
