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

test("Properties pane edits object X/Y with undo/redo and inheritance", async ({
  page,
  captureScreenshot,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await dropVideo(page, samplePath, "sample.mp4");

  const positionX = page.getByRole("textbox", { name: "Position X" });
  const positionY = page.getByRole("textbox", { name: "Position Y" });
  await expect(positionX).toBeVisible();
  await expect(positionY).toBeVisible();
  await expect(positionX).toHaveValue("960");
  await expect(positionY).toHaveValue("540");
  await expect(positionX).toHaveAttribute("data-inherited", "true");

  await positionX.fill("100");
  await positionX.press("Enter");
  await expect(positionX).toHaveValue("100");
  await expect(positionY).toHaveValue("540");
  await expect(positionX).toHaveAttribute("data-inherited", "false");

  await positionY.fill("200");
  await positionY.blur();
  await expect(positionY).toHaveValue("200");

  await page.keyboard.press("Control+z");
  await expect(positionY).toHaveValue("540");
  await expect(positionX).toHaveValue("100");

  await page.keyboard.press("Control+z");
  await expect(positionX).toHaveValue("960");
  await expect(positionY).toHaveValue("540");

  await page.keyboard.press("Control+Shift+z");
  await expect(positionX).toHaveValue("100");
  await expect(positionY).toHaveValue("540");

  await page.keyboard.press("Control+Shift+z");
  await expect(positionX).toHaveValue("100");
  await expect(positionY).toHaveValue("200");

  await page.getByRole("button", { name: "Select video track 1" }).click();
  await expect(page.getByText("Track defaults")).toBeVisible();
  const trackX = page.getByRole("textbox", { name: "Position X" });
  await expect(trackX).toHaveValue("960");
  await trackX.fill("50");
  await trackX.press("Enter");
  await expect(trackX).toHaveValue("50");

  await captureScreenshot("properties-object-track-layers");
});
