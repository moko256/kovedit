import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const bipBopPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "assets/bip-bop-60fps.mp4",
);

async function dropVideo(
  page: Page,
  filePath: string,
  name: string,
): Promise<void> {
  const buffer = [...new Uint8Array(fs.readFileSync(filePath))];
  const target = page.getByRole("region", { name: "Track 1" });
  await expect(target).toBeVisible();
  await target.evaluate(
    (el, { bytes, name, type }) => {
      const file = new File([new Uint8Array(bytes)], name, { type });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      el.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        }),
      );
    },
    { bytes: buffer, name, type: "video/mp4" },
  );
}

test("long 60fps clip keeps playing past mid-clip freeze zone", async ({
  page,
}) => {
  await page.goto("/");
  await dropVideo(page, bipBopPath, "bip-bop-60fps.mp4");

  const video = page.locator(".preview-pane__video");
  await expect(video).toHaveClass(/preview-pane__video--visible/);
  await expect
    .poll(async () =>
      video.evaluate((el: HTMLVideoElement) =>
        Number.isFinite(el.duration) ? el.duration : 0,
      ),
    )
    .toBeGreaterThan(9);

  await page.evaluate(() => {
    const el = document.querySelector(
      ".preview-pane__video",
    ) as HTMLVideoElement;
    const desc = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      "currentTime",
    );
    if (!desc?.get || !desc.set) {
      return;
    }
    (window as unknown as { __seekCount: number }).__seekCount = 0;
    Object.defineProperty(el, "currentTime", {
      configurable: true,
      get() {
        return desc.get!.call(this);
      },
      set(value: number) {
        (window as unknown as { __seekCount: number }).__seekCount += 1;
        desc.set!.call(this, value);
      },
    });
  });

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
  await expect(page.locator(".transport__frame")).toHaveText("");

  await expect
    .poll(
      async () => video.evaluate((el: HTMLVideoElement) => el.currentTime),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(4.5);

  const mid = await page.evaluate(() => {
    const el = document.querySelector(
      ".preview-pane__video",
    ) as HTMLVideoElement;
    return {
      frameText: document.querySelector(".transport__frame")?.textContent ?? "",
      playing: !!document.querySelector('[aria-label="Stop"]'),
      paused: el.paused,
      currentTime: el.currentTime,
      readyState: el.readyState,
      seekCount: (window as unknown as { __seekCount: number }).__seekCount,
    };
  });

  expect(mid.playing).toBe(true);
  expect(mid.paused).toBe(false);
  expect(mid.frameText).toBe("");
  expect(mid.readyState).toBeGreaterThanOrEqual(2);
  expect(mid.currentTime).toBeGreaterThan(4);
  expect(mid.seekCount).toBeLessThanOrEqual(2);

  await expect
    .poll(
      async () => video.evaluate((el: HTMLVideoElement) => el.currentTime),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(7.5);

  const late = await page.evaluate(() => {
    const el = document.querySelector(
      ".preview-pane__video",
    ) as HTMLVideoElement;
    return {
      playing: !!document.querySelector('[aria-label="Stop"]'),
      paused: el.paused,
      currentTime: el.currentTime,
      readyState: el.readyState,
      seekCount: (window as unknown as { __seekCount: number }).__seekCount,
    };
  });

  expect(late.playing).toBe(true);
  expect(late.paused).toBe(false);
  expect(late.readyState).toBeGreaterThanOrEqual(2);
  expect(late.currentTime).toBeGreaterThan(7);
  expect(late.seekCount).toBeLessThanOrEqual(2);
});
