export type TextDrawable = {
  kind: "text";
  text: string;
  width: number;
  height: number;
  fill?: string;
};

export type RectDrawable = {
  kind: "rect";
  width: number;
  height: number;
  fill?: string;
  rx?: number;
  ry?: number;
};

export type EllipseDrawable = {
  kind: "ellipse";
  width: number;
  height: number;
  fill?: string;
};

export type DrawableSvgInput = TextDrawable | RectDrawable | EllipseDrawable;

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function textFontSize(width: number, height: number): number {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  return Math.max(12, Math.min(safeHeight * 0.45, safeWidth * 0.18));
}

export function buildDrawableSvg(input: DrawableSvgInput): string {
  const width = Math.max(1, Math.round(input.width));
  const height = Math.max(1, Math.round(input.height));
  const fill = escapeXml(input.fill ?? "#ffffff");

  if (input.kind === "text") {
    const fontSize = textFontSize(width, height);
    const text = escapeXml(input.text);
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${fill}" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="${fontSize}">${text}</text>`,
      `</svg>`,
    ].join("");
  }

  if (input.kind === "rect") {
    const rx = Math.max(0, input.rx ?? 0);
    const ry = Math.max(0, input.ry ?? rx);
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<rect x="0" y="0" width="${width}" height="${height}" rx="${rx}" ry="${ry}" fill="${fill}" />`,
      `</svg>`,
    ].join("");
  }

  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" />`,
    `</svg>`,
  ].join("");
}

export function svgMarkupToDataUrl(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}
