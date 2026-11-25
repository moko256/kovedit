import { expect, test } from "./fixtures";

test("loads main editor UI and captures baseline screenshot", async ({
  page,
  captureScreenshot,
}) => {
  await page.goto("/");
  await expect(page.locator(".editor-shell")).toBeVisible();
  await expect(page.getByLabel("Editor menu")).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "ファイル" })).toBeVisible();
  await page.getByRole("menuitem", { name: "ファイル" }).click();
  await expect(page.getByRole("menuitem", { name: "開く" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "保存" })).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "エクスポート" }),
  ).toBeVisible();
  await expect(
    page.getByText("Preview", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Properties", { exact: true })).toBeVisible();
  await expect(page.getByText("Timeline", { exact: true })).toBeVisible();
  await captureScreenshot("editor-baseline");
});
