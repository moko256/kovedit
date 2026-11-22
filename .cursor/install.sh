#!/usr/bin/env bash
# Idempotent Cloud Agent install for kovedit (pnpm + Svelte + Tauri v2 + Rust + Playwright).
set -euo pipefail

# edition = "2024" in src-tauri requires rustc >= 1.85; base images may ship older.
if command -v rustup >/dev/null 2>&1; then
  rustup toolchain install stable --profile minimal
  rustup default stable
  rustup component add rustfmt clippy
else
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal
  # shellcheck source=/dev/null
  source "${CARGO_HOME:-$HOME/.cargo}/env"
  rustup component add rustfmt clippy
fi

# Tauri v2 Linux system libraries (skip when already present).
if ! pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    -o Dpkg::Options::="--force-confdef" \
    -o Dpkg::Options::="--force-confold" \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    pkg-config
fi

if command -v corepack >/dev/null 2>&1; then
  corepack enable
fi
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm
fi

pnpm install --frozen-lockfile

pnpm exec playwright install --with-deps chromium
pnpm exec playwright-cli install --skills=agents

if [[ -f src-tauri/Cargo.toml ]]; then
  (cd src-tauri && cargo fetch)
fi
