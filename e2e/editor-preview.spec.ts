import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const samplePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "assets/sample.mp4",
);

async function dropSampleVideo(page: Page): Promise<void> {
  const buffer = [...new Uint8Array(fs.readFileSync(samplePath))];
  const target = page.getByRole("region", { name: "Video track 1" });
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
    { bytes: buffer, name: "sample.mp4", type: "video/mp4" },
  );
}

test("preview uses DOM video and transport works", async ({
  page,
  captureScreenshot,
}) => {
  await page.goto("/");
  await dropSampleVideo(page);

  const video = page.locator(".preview-pane__video");
  await expect(video).toBeVisible();
  await expect(page.locator(".preview-pane canvas")).toHaveCount(0);
  await expect(video).toHaveClass(/preview-pane__video--visible/);
  await expect
    .poll(async () => page.locator(".transport__frame").innerText())
    .toBe("0f");

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
  await expect
    .poll(async () =>
      Number.parseInt(await page.locator(".transport__frame").innerText(), 10),
    )
    .toBeGreaterThan(5);

  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  const frozenFrame = Number.parseInt(
    await page.locator(".transport__frame").innerText(),
    10,
  );
  expect(frozenFrame).toBeGreaterThan(0);
  await expect(video).toHaveClass(/preview-pane__video--visible/);

  const seek = page.getByRole("slider", { name: "Seek" });
  await seek.fill("30");
  await expect(page.locator(".transport__frame")).toHaveText("30f");
  await expect
    .poll(async () => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0.4);

  await captureScreenshot("dom-preview-seek");
});
