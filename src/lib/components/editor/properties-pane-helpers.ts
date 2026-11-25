import type { PropertyChannelId } from "#lib/editor/properties.js";

export const NUMERIC_PROPERTY_FIELDS: {
  id: "width" | "height" | "x" | "y" | "opacity" | "rotation";
  label: string;
  aria: string;
}[] = [
  { id: "width", label: "Width", aria: "Width" },
  { id: "height", label: "Height", aria: "Height" },
  { id: "x", label: "X", aria: "Position X" },
  { id: "y", label: "Y", aria: "Position Y" },
  { id: "opacity", label: "Opacity", aria: "Opacity" },
  { id: "rotation", label: "Rotation", aria: "Rotation" },
];

export const DRAFT_CHANNEL_IDS: PropertyChannelId[] = [
  "anchor",
  "width",
  "height",
  "x",
  "y",
  "opacity",
  "rotation",
  "aspectRatioLock",
];

export function formatPropertyNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(4)));
}

export function parsePropertyNumber(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return fallback;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : fallback;
}

export function onPropertyNumberKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter") {
    return;
  }
  event.preventDefault();
  (event.currentTarget as HTMLInputElement).blur();
}
