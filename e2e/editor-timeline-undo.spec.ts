import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const samplePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "assets/sample.mp4",
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

async function dragClipBy(page: Page, name: string, dx: number): Promise<void> {
  const clip = page.getByRole("button", { name });
  await expect(clip).toBeVisible();
  await clip.evaluate((el, deltaX) => {
    const rect = el.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: startX,
        clientY: startY,
        pointerId: 1,
        button: 0,
        buttons: 1,
      }),
    );
    el.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: startX + deltaX,
        clientY: startY,
        pointerId: 1,
        button: 0,
        buttons: 1,
      }),
    );
    el.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        clientX: startX + deltaX,
        clientY: startY,
        pointerId: 1,
        button: 0,
        buttons: 0,
      }),
    );
  }, dx);
}

async function clipOffsetLeft(page: Page, name: string): Promise<number> {
  return page.getByRole("button", { name }).evaluate((el) => {
    const parent = el.parentElement;
    if (!parent) {
      return el.getBoundingClientRect().left;
    }
    return (
      el.getBoundingClientRect().left - parent.getBoundingClientRect().left
    );
  });
}

test("Ctrl+Z undoes a clip drag in the browser", async ({
  page,
  captureScreenshot,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await dropVideo(page, samplePath, "sample.mp4");

  const origin = await clipOffsetLeft(page, "sample.mp4");
  await dragClipBy(page, "sample.mp4", 240);
  const moved = await clipOffsetLeft(page, "sample.mp4");
  expect(moved).toBeGreaterThan(origin + 100);

  await page.keyboard.press("Control+z");
  await expect
    .poll(async () => clipOffsetLeft(page, "sample.mp4"))
    .toBeCloseTo(origin, 0);

  await captureScreenshot("timeline-undo-smoke");
});
