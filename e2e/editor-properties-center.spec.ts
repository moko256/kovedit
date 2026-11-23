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

test("Properties pane edits clip center X/Y with undo/redo", async ({
  page,
  captureScreenshot,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await dropVideo(page, samplePath, "sample.mp4");

  const centerX = page.getByRole("textbox", { name: "Center X" });
  const centerY = page.getByRole("textbox", { name: "Center Y" });
  await expect(centerX).toBeVisible();
  await expect(centerY).toBeVisible();
  await expect(centerX).toHaveValue("960");
  await expect(centerY).toHaveValue("540");

  await centerX.fill("100");
  await centerX.press("Enter");
  await expect(centerX).toHaveValue("100");
  await expect(centerY).toHaveValue("540");

  await centerY.fill("200");
  await centerY.blur();
  await expect(centerY).toHaveValue("200");

  await page.keyboard.press("Control+z");
  await expect(centerY).toHaveValue("540");
  await expect(centerX).toHaveValue("100");

  await page.keyboard.press("Control+z");
  await expect(centerX).toHaveValue("960");
  await expect(centerY).toHaveValue("540");

  await page.keyboard.press("Control+Shift+z");
  await expect(centerX).toHaveValue("100");
  await expect(centerY).toHaveValue("540");

  await page.keyboard.press("Control+Shift+z");
  await expect(centerX).toHaveValue("100");
  await expect(centerY).toHaveValue("200");

  await captureScreenshot("properties-center-xy");
});
