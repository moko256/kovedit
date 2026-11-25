<script lang="ts">
  import { Input } from "#lib/components/ui/input/index.js";
  import { ScrollArea } from "#lib/components/ui/scroll-area/index.js";
  import { Separator } from "#lib/components/ui/separator/index.js";
  import {
    ANCHOR_OPTIONS,
    isChannelAnimated,
    isEndpointKeyframeFrame,
    type Anchor,
    type AnimatedChannel,
    type ChannelValueMap,
    type Interpolation,
    type PropertyChannelId,
    type PropertySource,
  } from "#lib/editor/properties.js";
  import type {
    PropertiesPanelHandlers,
    PropertiesPanelModel,
  } from "./properties-panel.js";

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
    rateText = formatNumber(panel.playbackRate);
    textContent = panel.text;
    const nextValues: Record<string, string> = {};
    const nextFrames: Record<string, string> = {};
    for (const id of [
      "anchor",
      "width",
      "height",
      "x",
      "y",
      "opacity",
      "rotation",
      "aspectRatioLock",
    ] as PropertyChannelId[]) {
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
          nextValues[draftKey] = formatNumber(keyframe.value as number);
        }
      }
    }
    draftValues = nextValues;
    draftFrames = nextFrames;
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

  function onNumberKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    (event.currentTarget as HTMLInputElement).blur();
  }

  function onInterpolationChange(id: PropertyChannelId, event: Event): void {
    if (!panel) {
      return;
    }
    const value = (event.currentTarget as HTMLSelectElement)
      .value as Interpolation;
    handlers.setPropertyInterpolation(id, value);
  }

  function onAnimationToggle(id: PropertyChannelId, event: Event): void {
    if (!panel) {
      return;
    }
    const checked = (event.currentTarget as HTMLInputElement).checked;
    handlers.setPropertyAnimationEnabled(id, checked, panel.durationFrames);
  }

  function commitNumericKeyframe(
    id: "width" | "height" | "x" | "y" | "opacity" | "rotation",
    frame: number,
    raw: string,
  ): void {
    if (!panel) {
      return;
    }
    const channel = channelFor(id);
    const existing = channel?.keyframes.find((k) => k.frame === frame);
    const fallback =
      typeof existing?.value === "number"
        ? existing.value
        : panel.resolved[id].value;
    handlers.setPropertyValue(id, parseNumber(raw, fallback), frame);
  }

  function commitKeyframeFrame(
    id: PropertyChannelId,
    fromFrame: number,
    raw: string,
  ): void {
    if (!panel) {
      return;
    }
    const channel = channelFor(id);
    if (!channel || isEndpointKeyframeFrame(channel, fromFrame)) {
      return;
    }
    const next = Math.floor(parseNumber(raw, fromFrame));
    if (next === fromFrame) {
      return;
    }
    handlers.movePropertyKeyframe(id, fromFrame, next);
  }

  function commitRate(raw: string): void {
    if (!panel || !panel.media) {
      return;
    }
    handlers.setPlaybackRate(parseNumber(raw, panel.playbackRate));
  }

  function commitText(raw: string): void {
    if (!panel || panel.objectType !== "text") {
      return;
    }
    handlers.setTextContent(raw);
  }

  function channelInterpolation(id: PropertyChannelId): Interpolation {
    return channelFor(id)?.interpolation ?? "linear";
  }

  function channelAnimated(id: PropertyChannelId): boolean {
    return isChannelAnimated(channelFor(id) ?? undefined);
  }

  function addKeyframeAtPlayhead(id: PropertyChannelId): void {
    if (!panel) {
      return;
    }
    const channel = channelFor(id);
    if (!channel || !isChannelAnimated(channel)) {
      return;
    }
    const frame = panel.frame;
    if (isEndpointKeyframeFrame(channel, frame)) {
      return;
    }
    if (channel.keyframes.some((k) => k.frame === frame)) {
      return;
    }
    handlers.setPropertyValue(id, panel.resolved[id].value, frame);
  }

  const numericFields: {
    id: "width" | "height" | "x" | "y" | "opacity" | "rotation";
    label: string;
    aria: string;
  }[] = [
    { id: "width", label: "Width", aria: "Width" },
    { id: "height", label: "Height", aria: "Height" },
    { id: "x", label: "X", aria: "Position X" },
    { id: "y", label: "Y", aria: "Position Y" },
    { id: "opacity", label: "Opacity", aria: "Opacity" },
    { id: "rotation", label: "Rotation", aria: "Rotation" },
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
                  onkeydown={onNumberKeydown}
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
                  onkeydown={onNumberKeydown}
                />
              </dd>
            </div>
          {/if}

          {#if panel.drawable}
            <div class="properties-pane__row">
              <dt>
                <span>基準 (Anchor)</span>
                <label class="properties-pane__animate">
                  <input
                    type="checkbox"
                    aria-label="Animate anchor"
                    checked={channelAnimated("anchor")}
                    onchange={(event) => onAnimationToggle("anchor", event)}
                  />
                  Animate
                </label>
              </dt>
              <dd class={sourceClass(panel.resolved.anchor.source)}>
                {#if channelAnimated("anchor")}
                  {@const channel = channelFor("anchor")}
                  <div class="properties-pane__keyframes">
                    {#each channel?.keyframes ?? [] as keyframe (keyframe.frame)}
                      {@const draftKey = `anchor:${keyframe.frame}`}
                      {@const fixed = isEndpointKeyframeFrame(
                        channel!,
                        keyframe.frame,
                      )}
                      <div class="properties-pane__keyframe">
                        <Input
                          type="text"
                          inputmode="numeric"
                          aria-label={`Anchor keyframe frame ${keyframe.frame}`}
                          data-keyframe-frame={keyframe.frame}
                          data-fixed={fixed ? "true" : "false"}
                          disabled={fixed}
                          value={draftFrames[draftKey] ??
                            String(keyframe.frame)}
                          oninput={(event) =>
                            (draftFrames[draftKey] = (
                              event.currentTarget as HTMLInputElement
                            ).value)}
                          onblur={() =>
                            commitKeyframeFrame(
                              "anchor",
                              keyframe.frame,
                              draftFrames[draftKey] ?? String(keyframe.frame),
                            )}
                          onkeydown={onNumberKeydown}
                        />
                        <span class="properties-pane__kv-sep">:</span>
                        <select
                          class={[
                            "properties-pane__select",
                            panel.kind === "clip" &&
                            panel.resolved.anchor.source === "track"
                              ? "properties-pane__inherited-control"
                              : "",
                          ]}
                          aria-label={`Anchor value at frame ${keyframe.frame}`}
                          data-inherited={panel.kind === "clip" &&
                          panel.resolved.anchor.source === "track"
                            ? "true"
                            : "false"}
                          value={String(keyframe.value)}
                          onchange={(event) =>
                            handlers.setPropertyValue(
                              "anchor",
                              (event.currentTarget as HTMLSelectElement)
                                .value as Anchor,
                              keyframe.frame,
                            )}
                        >
                          {#each ANCHOR_OPTIONS as option (option)}
                            <option value={option}>{option}</option>
                          {/each}
                        </select>
                      </div>
                    {/each}
                    <div class="properties-pane__keyframe-actions">
                      <button
                        type="button"
                        class="properties-pane__add"
                        onclick={() => addKeyframeAtPlayhead("anchor")}
                      >
                        Add at playhead
                      </button>
                      <select
                        class="properties-pane__select properties-pane__select--interp"
                        aria-label="Anchor interpolation"
                        value={channelInterpolation("anchor")}
                        onchange={(event) =>
                          onInterpolationChange("anchor", event)}
                      >
                        <option value="linear">linear</option>
                        <option value="hold">hold</option>
                      </select>
                    </div>
                  </div>
                {:else}
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
                      onchange={(event) =>
                        handlers.setPropertyValue(
                          "anchor",
                          (event.currentTarget as HTMLSelectElement)
                            .value as Anchor,
                          panel.frame,
                        )}
                    >
                      {#each ANCHOR_OPTIONS as option (option)}
                        <option value={option}>{option}</option>
                      {/each}
                    </select>
                    <select
                      class="properties-pane__select properties-pane__select--interp"
                      aria-label="Anchor interpolation"
                      value={channelInterpolation("anchor")}
                      onchange={(event) =>
                        onInterpolationChange("anchor", event)}
                    >
                      <option value="linear">linear</option>
                      <option value="hold">hold</option>
                    </select>
                  </div>
                {/if}
              </dd>
            </div>

            {#each numericFields as field (field.id)}
              <div class="properties-pane__row">
                <dt>
                  <span>{field.label}</span>
                  <label class="properties-pane__animate">
                    <input
                      type="checkbox"
                      aria-label={`Animate ${field.aria}`}
                      checked={channelAnimated(field.id)}
                      onchange={(event) => onAnimationToggle(field.id, event)}
                    />
                    Animate
                  </label>
                </dt>
                <dd class={sourceClass(panel.resolved[field.id].source)}>
                  {#if channelAnimated(field.id)}
                    {@const channel = channelFor(field.id)}
                    <div
                      class="properties-pane__keyframes"
                      data-channel={field.id}
                    >
                      {#each channel?.keyframes ?? [] as keyframe (keyframe.frame)}
                        {@const draftKey = `${field.id}:${keyframe.frame}`}
                        {@const fixed = isEndpointKeyframeFrame(
                          channel!,
                          keyframe.frame,
                        )}
                        <div class="properties-pane__keyframe">
                          <Input
                            type="text"
                            inputmode="numeric"
                            aria-label={`${field.aria} keyframe frame ${keyframe.frame}`}
                            data-keyframe-frame={keyframe.frame}
                            data-fixed={fixed ? "true" : "false"}
                            disabled={fixed}
                            value={draftFrames[draftKey] ??
                              String(keyframe.frame)}
                            oninput={(event) =>
                              (draftFrames[draftKey] = (
                                event.currentTarget as HTMLInputElement
                              ).value)}
                            onblur={() =>
                              commitKeyframeFrame(
                                field.id,
                                keyframe.frame,
                                draftFrames[draftKey] ?? String(keyframe.frame),
                              )}
                            onkeydown={onNumberKeydown}
                          />
                          <span class="properties-pane__kv-sep">:</span>
                          <Input
                            type="text"
                            inputmode="decimal"
                            autocomplete="off"
                            spellcheck={false}
                            aria-label={`${field.aria} value at frame ${keyframe.frame}`}
                            data-inherited={panel.kind === "clip" &&
                            panel.resolved[field.id].source === "track"
                              ? "true"
                              : "false"}
                            class={panel.kind === "clip" &&
                            panel.resolved[field.id].source === "track"
                              ? "properties-pane__inherited-control"
                              : undefined}
                            value={draftValues[draftKey] ??
                              formatNumber(keyframe.value as number)}
                            oninput={(event) =>
                              (draftValues[draftKey] = (
                                event.currentTarget as HTMLInputElement
                              ).value)}
                            onblur={() =>
                              commitNumericKeyframe(
                                field.id,
                                keyframe.frame,
                                draftValues[draftKey] ??
                                  formatNumber(keyframe.value as number),
                              )}
                            onkeydown={onNumberKeydown}
                          />
                        </div>
                      {/each}
                      <div class="properties-pane__keyframe-actions">
                        <button
                          type="button"
                          class="properties-pane__add"
                          onclick={() => addKeyframeAtPlayhead(field.id)}
                        >
                          Add at playhead
                        </button>
                        <select
                          class="properties-pane__select properties-pane__select--interp"
                          aria-label={`${field.aria} interpolation`}
                          value={channelInterpolation(field.id)}
                          onchange={(event) =>
                            onInterpolationChange(field.id, event)}
                        >
                          <option value="linear">linear</option>
                          <option value="hold">hold</option>
                        </select>
                      </div>
                    </div>
                  {:else}
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
                        value={draftValues[`${field.id}:0`] ??
                          formatNumber(panel.resolved[field.id].value)}
                        oninput={(event) =>
                          (draftValues[`${field.id}:0`] = (
                            event.currentTarget as HTMLInputElement
                          ).value)}
                        onblur={() =>
                          commitNumericKeyframe(
                            field.id,
                            0,
                            draftValues[`${field.id}:0`] ??
                              formatNumber(panel.resolved[field.id].value),
                          )}
                        onkeydown={onNumberKeydown}
                      />
                      <select
                        class="properties-pane__select properties-pane__select--interp"
                        aria-label={`${field.aria} interpolation`}
                        value={channelInterpolation(field.id)}
                        onchange={(event) =>
                          onInterpolationChange(field.id, event)}
                      >
                        <option value="linear">linear</option>
                        <option value="hold">hold</option>
                      </select>
                    </div>
                  {/if}
                </dd>
              </div>
            {/each}

            <div class="properties-pane__row">
              <dt>
                <span>Aspect Lock</span>
                <label class="properties-pane__animate">
                  <input
                    type="checkbox"
                    aria-label="Animate aspect ratio lock"
                    checked={channelAnimated("aspectRatioLock")}
                    onchange={(event) =>
                      onAnimationToggle("aspectRatioLock", event)}
                  />
                  Animate
                </label>
              </dt>
              <dd class={sourceClass(panel.resolved.aspectRatioLock.source)}>
                {#if channelAnimated("aspectRatioLock")}
                  {@const channel = channelFor("aspectRatioLock")}
                  <div class="properties-pane__keyframes">
                    {#each channel?.keyframes ?? [] as keyframe (keyframe.frame)}
                      {@const draftKey = `aspectRatioLock:${keyframe.frame}`}
                      {@const fixed = isEndpointKeyframeFrame(
                        channel!,
                        keyframe.frame,
                      )}
                      <div class="properties-pane__keyframe">
                        <Input
                          type="text"
                          inputmode="numeric"
                          aria-label={`Aspect lock keyframe frame ${keyframe.frame}`}
                          data-fixed={fixed ? "true" : "false"}
                          disabled={fixed}
                          value={draftFrames[draftKey] ??
                            String(keyframe.frame)}
                          oninput={(event) =>
                            (draftFrames[draftKey] = (
                              event.currentTarget as HTMLInputElement
                            ).value)}
                          onblur={() =>
                            commitKeyframeFrame(
                              "aspectRatioLock",
                              keyframe.frame,
                              draftFrames[draftKey] ?? String(keyframe.frame),
                            )}
                          onkeydown={onNumberKeydown}
                        />
                        <span class="properties-pane__kv-sep">:</span>
                        <label class="properties-pane__check">
                          <input
                            type="checkbox"
                            aria-label={`Aspect ratio lock at frame ${keyframe.frame}`}
                            checked={Boolean(keyframe.value)}
                            onchange={(event) =>
                              handlers.setPropertyValue(
                                "aspectRatioLock",
                                (event.currentTarget as HTMLInputElement)
                                  .checked,
                                keyframe.frame,
                              )}
                          />
                          Lock
                        </label>
                      </div>
                    {/each}
                    <div class="properties-pane__keyframe-actions">
                      <button
                        type="button"
                        class="properties-pane__add"
                        onclick={() => addKeyframeAtPlayhead("aspectRatioLock")}
                      >
                        Add at playhead
                      </button>
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
                  </div>
                {:else}
                  <div class="properties-pane__field-row">
                    <label class="properties-pane__check">
                      <input
                        type="checkbox"
                        aria-label="Aspect ratio lock"
                        checked={panel.resolved.aspectRatioLock.value}
                        onchange={(event) =>
                          handlers.setPropertyValue(
                            "aspectRatioLock",
                            (event.currentTarget as HTMLInputElement).checked,
                            panel.frame,
                          )}
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
                {/if}
              </dd>
            </div>
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

  .properties-pane__animate {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: #52606d;
    cursor: pointer;
  }

  .properties-pane__keyframes {
    display: grid;
    gap: 0.35rem;
  }

  .properties-pane__keyframe {
    display: grid;
    grid-template-columns: 3.25rem auto 1fr;
    gap: 0.3rem;
    align-items: center;
  }

  .properties-pane__kv-sep {
    color: #8a93a0;
    font-weight: 600;
  }

  .properties-pane__keyframe-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
  }

  .properties-pane__add {
    margin: 0;
    padding: 0.25rem 0.45rem;
    border: 1px solid #c5cbd3;
    border-radius: 0.4rem;
    background: #eef1f4;
    color: #1f2933;
    font: inherit;
    font-size: 0.7rem;
    cursor: pointer;
  }

  .properties-pane__add:hover {
    background: #e2e6eb;
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
