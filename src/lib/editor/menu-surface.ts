export type MenuSurface = "web" | "native";

export function resolveMenuSurface(input: {
  tauri: boolean;
  platform: string;
  userAgent?: string;
}): MenuSurface {
  if (!input.tauri) {
    return "web";
  }

  const platform = input.platform.toLowerCase();
  const userAgent = (input.userAgent ?? "").toLowerCase();
  const isMac =
    platform.includes("mac") ||
    userAgent.includes("macintosh") ||
    userAgent.includes("mac os");

  return isMac ? "native" : "web";
}

export function detectMenuSurface(): MenuSurface {
  const tauri =
    typeof globalThis !== "undefined" &&
    Boolean((globalThis as { isTauri?: boolean }).isTauri);
  const platform =
    typeof navigator !== "undefined" ? (navigator.platform ?? "") : "";
  const userAgent =
    typeof navigator !== "undefined" ? (navigator.userAgent ?? "") : "";
  return resolveMenuSurface({ tauri, platform, userAgent });
}
