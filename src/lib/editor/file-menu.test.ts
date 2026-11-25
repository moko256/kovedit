import { describe, expect, test, vi } from "vitest";
import {
  FILE_MENU_ITEMS,
  FILE_MENU_LABEL,
  resolveFileMenuAction,
} from "./file-menu";

describe("file menu shell", () => {
  test("exposes File menu label and stub actions", () => {
    expect(FILE_MENU_LABEL).toBe("ファイル");
    expect(FILE_MENU_ITEMS.map((item) => item.text)).toEqual([
      "開く",
      "保存",
      "エクスポート",
    ]);
  });

  test("wires export action while leaving open/save as noop by default", () => {
    const exportFn = vi.fn();
    const open = resolveFileMenuAction("file-open");
    const save = resolveFileMenuAction("file-save");
    const exp = resolveFileMenuAction("file-export", { export: exportFn });
    open();
    save();
    exp();
    expect(exportFn).toHaveBeenCalledTimes(1);
  });
});
