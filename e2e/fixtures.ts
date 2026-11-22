import path from "node:path";
import { expect, test as base } from "@playwright/test";

type CaptureFixtures = {
  captureScreenshot: (name: string) => Promise<string>;
};

export const test = base.extend<CaptureFixtures>({
  captureScreenshot: async ({ page }, use, testInfo) => {
    await use(async (name) => {
      const filePath = path.join(testInfo.outputDir, `${name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      await testInfo.attach(name, {
        path: filePath,
        contentType: "image/png",
      });
      return filePath;
    });
  },
});

export { expect };
