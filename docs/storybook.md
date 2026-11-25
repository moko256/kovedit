# Storybook

Presentational editor UI can be developed in isolation with Storybook.

```sh
pnpm storybook
```

Stories live next to components as `*.stories.svelte` under `src/lib/components/editor/`.

App wiring (store, actions, hotkeys, native menu) stays in `EditorApp.svelte`. Shell layout, menu bar, transport, timeline, and properties panes take props/callbacks so they render without `MainStore` / `MainAction`.

Static build (optional, local only):

```sh
pnpm build-storybook
```

There is intentionally no CI workflow for Storybook builds.
