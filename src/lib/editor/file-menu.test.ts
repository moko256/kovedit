import { describe, expect, test } from "vitest";
import { FILE_MENU_ITEMS, FILE_MENU_LABEL } from "./file-menu";

describe("file menu shell", () => {
  test("exposes File menu label and stub actions", () => {
    expect(FILE_MENU_LABEL).toBe("ファイル");
    expect(FILE_MENU_ITEMS.map((item) => item.text)).toEqual([
      "開く",
      "保存",
      "エクスポート",
    ]);
  });
});
