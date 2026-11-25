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

test("enabling animation shows keyframe tracks and frame:value editors", async ({
  page,
  captureScreenshot,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await dropVideo(page, samplePath, "sample.mp4");

  const animateX = page.getByRole("checkbox", { name: "Animate Position X" });
  await expect(animateX).toBeVisible();
  await expect(animateX).not.toBeChecked();
  await animateX.check();
  await expect(animateX).toBeChecked();

  await expect(page.getByTestId("keyframe-lanes")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /X keyframe at frame 0 \(fixed\)/i }),
  ).toBeVisible();

  const startValue = page.getByRole("textbox", {
    name: "Position X value at frame 0",
  });
  await expect(startValue).toBeVisible();
  await expect(startValue).toHaveValue("960");

  await captureScreenshot("keyframe-tracks-enabled");
});
