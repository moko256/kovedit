# Playwright (screenshots & video)

Use Playwright when a UI change needs a visual baseline, a failure screenshot/video, or a short recorded interaction for agents/reviewers. Prefer this over ad-hoc browser automation for repeatable captures.

## Setup (once per machine / cloud env)

```bash
pnpm install
pnpm exec playwright install --with-deps chromium
pnpm exec playwright-cli install --skills=agents
```

Cloud Agents: `.cursor/install.sh` already runs the browser + skills steps after `pnpm install`.

## Run

```bash
pnpm test:e2e
pnpm test:e2e:ui
```

`webServer` starts `pnpm dev` on `http://127.0.0.1:1420` unless that server is already up (local reuse).

## Artifacts

| Path                 | Contents                                                                       |
| -------------------- | ------------------------------------------------------------------------------ |
| `test-results/`      | Per-test output: intentional screenshots, failure screenshots, retained videos |
| `playwright-report/` | HTML report (`pnpm exec playwright show-report`)                               |
| `.playwright-cli/`   | playwright-cli session output (gitignored)                                     |

Config defaults: screenshot + video **on failure**; intentional captures via the `captureScreenshot` fixture in `e2e/fixtures.ts`. Video sample: top-level `test.use({ video: "on" })` in `e2e/editor-video.spec.ts` (must be file-level, not nested `describe`).

## Add a capture for a UI change

1. Add or extend a spec under `e2e/` (reuse `./fixtures`).
2. Assert the UI is ready with stable selectors (roles/text/CSS already in the shell).
3. Call `await captureScreenshot("short-name")` for a baseline PNG attached to the test.
4. For a short video, wrap the test in `test.describe` + `test.use({ video: "on" })` and keep the interaction flaky-free (no fixed sleeps).
5. Run `pnpm test:e2e` and collect files from `test-results/`.

## CI

E2E is **local / cloud-agent first** for now: `ci-npm.yml` stays format + lint only so the npm/Rust CI split stays light. Revisit wiring Chromium into CI once the harness is in regular use.

## Agent skill

`playwright-cli` skill lives at `.agents/skills/playwright-cli` (installed with `--skills=agents`). Use it for interactive browser CLI work; use `@playwright/test` specs for repeatable screenshot/video foundation tests.
