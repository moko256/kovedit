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

test("timeline scrub and hotkeys wire through the browser", async ({
  page,
  captureScreenshot,
}) => {
  await page.goto("/");
  await dropVideo(page, samplePath, "sample.mp4");

  const frame = page.locator(".transport__frame");
  await expect(frame).toHaveText("0f");

  const ruler = page.getByRole("slider", { name: "Timeline scrub" });
  await expect(ruler).toBeVisible();
  const box = await ruler.boundingBox();
  expect(box).toBeTruthy();
  if (!box) {
    return;
  }

  const scrubY = box.y + box.height / 2;
  await page.mouse.move(box.x + 41, scrubY);
  await page.mouse.down();
  await expect(frame).not.toHaveText("0f");
  await page.mouse.up();

  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

  const positionX = page.getByRole("textbox", { name: "Position X" });
  await expect(positionX).toBeVisible();
  await positionX.click();
  await positionX.fill("12");
  await page.keyboard.press("ArrowLeft");
  const frozen = await frame.innerText();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  await expect(positionX).toHaveValue("1 2");
  await expect(frame).toHaveText(frozen);

  await captureScreenshot("timeline-scrub-hotkeys");
});
