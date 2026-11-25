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

test("Properties pane shows inherited object values and track defaults", async ({
  page,
  captureScreenshot,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await dropVideo(page, samplePath, "sample.mp4");

  const positionX = page.getByRole("textbox", { name: "Position X" });
  await expect(positionX).toBeVisible();
  await expect(positionX).toHaveValue("960");
  await expect(positionX).toHaveAttribute("data-inherited", "true");

  await positionX.fill("100");
  await positionX.press("Enter");
  await expect(positionX).toHaveValue("100");
  await expect(positionX).toHaveAttribute("data-inherited", "false");

  await page.getByRole("button", { name: "Select track 1" }).click();
  await expect(page.getByText("Track defaults")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Position X" })).toHaveValue(
    "960",
  );

  await captureScreenshot("properties-object-track-layers");
});
