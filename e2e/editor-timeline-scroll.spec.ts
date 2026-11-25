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

test("keeps page width fixed while timeline scrolls horizontally", async ({
  page,
  captureScreenshot,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await dropVideo(page, samplePath, "sample.mp4");

  const clip = page.getByRole("button", { name: "sample.mp4" });
  await expect(clip).toBeVisible();

  await clip.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    const dx = 1600;
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
        clientX: startX + dx,
        clientY: startY,
        pointerId: 1,
        button: 0,
        buttons: 1,
      }),
    );
    el.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        clientX: startX + dx,
        clientY: startY,
        pointerId: 1,
        button: 0,
        buttons: 0,
      }),
    );
  });

  const hScroll = page.getByRole("scrollbar", {
    name: "Timeline horizontal scroll",
  });
  const viewport = page.locator(".timeline__scroll");
  const thumb = page.locator(".timeline__hscroll-thumb");
  await expect(hScroll).toBeVisible();
  await expect(thumb).toBeVisible();

  const before = await page.evaluate(() => {
    const scroll = document.querySelector(".timeline__scroll");
    const bar = document.querySelector(".timeline__hscroll");
    if (!(scroll instanceof HTMLElement) || !(bar instanceof HTMLElement)) {
      return null;
    }
    return {
      docScrollWidth: document.documentElement.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
      scrollClientWidth: scroll.clientWidth,
      scrollScrollWidth: scroll.scrollWidth,
      hScrollHeight: bar.getBoundingClientRect().height,
    };
  });

  expect(before).not.toBeNull();
  expect(before!.hScrollHeight).toBeGreaterThanOrEqual(12);
  expect(before!.docScrollWidth).toBe(before!.docClientWidth);
  expect(before!.scrollScrollWidth).toBeGreaterThan(before!.scrollClientWidth);

  await viewport.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });

  await expect
    .poll(async () => viewport.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  await expect
    .poll(async () =>
      thumb.evaluate((el) => {
        const transform = getComputedStyle(el).transform;
        if (!transform || transform === "none") {
          return 0;
        }
        const match = /matrix\(([^)]+)\)/.exec(transform);
        if (!match) {
          return 0;
        }
        return Number(match[1].split(",")[4] ?? 0);
      }),
    )
    .toBeGreaterThan(0);

  await captureScreenshot("timeline-inner-hscroll");
});
