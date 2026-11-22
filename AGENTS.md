# kovedit

Web-based video editor.

Stack:

- pnpm
- Tauri v2
- Svelte

Rust layout:

- Cargo workspace under `src-tauri/`
- `src-tauri/app` — Tauri app package
- `src-tauri/lints/no_source_comments` — Dylint library (source-comment ban)

## Starting work

Before starting work, sync latest `main` into your branch:

```bash
git fetch origin main && git merge origin/main
```

## Playwright

Screenshots/video foundation for UI work: `docs/playwright.md`. Run `pnpm test:e2e`. Artifacts: `test-results/`, `playwright-report/`. Agent skill: `.agents/skills/playwright-cli` (`playwright-cli install --skills=agents`).

## Cursor Cloud specific instructions

Cloud Agents use the repo-managed environment at `.cursor/environment.json` (install via `.cursor/install.sh`: Rust stable, Tauri Linux deps, `pnpm install`, Playwright Chromium + deps, `playwright-cli` agent skills, `cargo fetch`). Frontend: `pnpm dev` on port 1420. After install script changes, trigger a new environment build so the snapshot picks them up.
