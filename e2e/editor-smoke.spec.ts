import { expect, test } from "./fixtures";

test("loads main editor UI and captures baseline screenshot", async ({
  page,
  captureScreenshot,
}) => {
  await page.goto("/");
  await expect(page.locator(".editor-shell")).toBeVisible();
  await expect(
    page.getByText("Preview", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Properties", { exact: true })).toBeVisible();
  await expect(page.getByText("Timeline", { exact: true })).toBeVisible();
  await captureScreenshot("editor-baseline");
});
