import { describe, expect, test } from "vitest";
import { resolveMenuSurface } from "./menu-surface";

describe("resolveMenuSurface", () => {
  test("uses web menu outside Tauri", () => {
    expect(resolveMenuSurface({ tauri: false, platform: "MacIntel" })).toBe(
      "web",
    );
    expect(resolveMenuSurface({ tauri: false, platform: "Win32" })).toBe("web");
  });

  test("uses native menu on Tauri macOS", () => {
    expect(resolveMenuSurface({ tauri: true, platform: "MacIntel" })).toBe(
      "native",
    );
    expect(
      resolveMenuSurface({
        tauri: true,
        platform: "",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      }),
    ).toBe("native");
  });

  test("uses web menu on Tauri Windows and Linux", () => {
    expect(resolveMenuSurface({ tauri: true, platform: "Win32" })).toBe("web");
    expect(resolveMenuSurface({ tauri: true, platform: "Linux x86_64" })).toBe(
      "web",
    );
  });
});
