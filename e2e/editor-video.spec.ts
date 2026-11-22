import { expect, test } from "./fixtures";

test.use({ video: "on" });

test("records a short stable editor interaction", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".editor-shell")).toBeVisible();
  await page.locator(".timeline").hover();
  await page.locator(".properties-pane").hover();
  await expect(page.locator(".preview-pane")).toBeVisible();
});
