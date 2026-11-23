import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const largePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "assets/large.mp4",
);

async function dropVideo(
  page: Page,
  filePath: string,
  name: string,
): Promise<void> {
  const buffer = [...new Uint8Array(fs.readFileSync(filePath))];
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
    { bytes: buffer, name, type: "video/mp4" },
  );
}

test("preview uses DOM video and transport works", async ({
  page,
  captureScreenshot,
}) => {
  await page.goto("/");
  await dropVideo(page, largePath, "large.mp4");

  const video = page.locator(".preview-pane__video");
  const stage = page.locator(".preview-pane__stage");
  await expect(video).toBeVisible();
  await expect(page.locator(".preview-pane canvas")).toHaveCount(0);
  await expect(video).toHaveClass(/preview-pane__video--visible/);
  await expect(video).toHaveAttribute("data-prop-animation", /kovedit-prop-/);
  await expect
    .poll(async () =>
      video.evaluate(
        (el: HTMLVideoElement) => getComputedStyle(el).animationName,
      ),
    )
    .toMatch(/kovedit-prop-/);
  await expect
    .poll(async () =>
      video.evaluate(
        (el: HTMLVideoElement) => getComputedStyle(el).animationPlayState,
      ),
    )
    .toBe("paused");
  await expect
    .poll(async () => video.evaluate((el: HTMLVideoElement) => el.videoWidth))
    .toBeGreaterThan(1280);
  await expect
    .poll(async () => page.locator(".transport__frame").innerText())
    .toBe("0f");

  await expect
    .poll(async () => {
      const videoBox = await video.boundingBox();
      const stageBox = await stage.boundingBox();
      if (!videoBox || !stageBox) {
        return false;
      }
      return (
        videoBox.x >= stageBox.x - 1 &&
        videoBox.y >= stageBox.y - 1 &&
        videoBox.x + videoBox.width <= stageBox.x + stageBox.width + 1 &&
        videoBox.y + videoBox.height <= stageBox.y + stageBox.height + 1
      );
    })
    .toBe(true);

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
  await expect
    .poll(async () =>
      video.evaluate(
        (el: HTMLVideoElement) => getComputedStyle(el).animationPlayState,
      ),
    )
    .toBe("running");
  await expect
    .poll(async () => video.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(false);
  await expect(page.locator(".transport__frame")).toHaveText("");
  await expect
    .poll(async () => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0.05);

  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  await expect
    .poll(async () =>
      video.evaluate(
        (el: HTMLVideoElement) => getComputedStyle(el).animationPlayState,
      ),
    )
    .toBe("paused");
  await expect
    .poll(async () => video.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(true);
  const frozenFrame = Number.parseInt(
    await page.locator(".transport__frame").innerText(),
    10,
  );
  expect(frozenFrame).toBeGreaterThan(0);
  await expect(video).toHaveClass(/preview-pane__video--visible/);

  const seek = page.getByRole("slider", { name: "Seek" });
  await seek.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("ArrowRight");
  }
  await expect(page.locator(".transport__frame")).toHaveText("30f");
  await expect
    .poll(async () => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0.4);
  await expect
    .poll(async () => video.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(true);

  await captureScreenshot("dom-preview-fit-play");
});
