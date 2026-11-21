# Tauri + SvelteKit + TypeScript

This template should help get you started developing with Tauri, SvelteKit and TypeScript in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).

## Git hooks

A Husky **pre-push** hook runs `pnpm format:check` and `pnpm lint` and aborts the push if either fails.

Hooks install automatically via the `prepare` script when you run:

```bash
pnpm install
```

To install hooks without a full reinstall:

```bash
pnpm prepare
```

## Lint

Source comments are banned in Rust, TypeScript, JavaScript, and Svelte `<script>` blocks (express intent in code). Prettier cannot enforce that; use the linters instead:

```sh
pnpm lint
```

That runs `svelte-check`, ESLint (`eslint-plugin-no-comments`), and `cargo dylint` (`lints/no_source_comments`). Clippy has no lint that forbids comments; the Rust side is a Cargo workspace with the Tauri app (`src-tauri`) and a Dylint library (`lints/no_source_comments`).

Install the Dylint runners once:

```sh
cargo install cargo-dylint dylint-link --locked
```
