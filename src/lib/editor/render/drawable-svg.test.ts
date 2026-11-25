import { describe, expect, test } from "vitest";
import {
  buildDrawableSvg,
  escapeXml,
  svgMarkupToDataUrl,
  textFontSize,
} from "./drawable-svg";

describe("drawable svg", () => {
  test("escapes xml special characters", () => {
    expect(escapeXml(`a<b>&"c'`)).toBe("a&lt;b&gt;&amp;&quot;c&apos;");
  });

  test("builds text svg markup with shared dual-mode payload", () => {
    const markup = buildDrawableSvg({
      kind: "text",
      text: "Hello <world>",
      width: 400,
      height: 200,
      fill: "#ffcc00",
    });
    expect(markup).toContain('width="400"');
    expect(markup).toContain('height="200"');
    expect(markup).toContain("Hello &lt;world&gt;");
    expect(markup).toContain('fill="#ffcc00"');
    expect(markup).toContain(`font-size="${textFontSize(400, 200)}"`);
  });

  test("builds shape svg markup for rect and ellipse", () => {
    const rect = buildDrawableSvg({
      kind: "rect",
      width: 100,
      height: 50,
      rx: 4,
    });
    expect(rect).toContain("<rect ");
    expect(rect).toContain('rx="4"');

    const ellipse = buildDrawableSvg({
      kind: "ellipse",
      width: 80,
      height: 40,
    });
    expect(ellipse).toContain("<ellipse ");
    expect(ellipse).toContain('rx="40"');
    expect(ellipse).toContain('ry="20"');
  });

  test("encodes svg as a data url for canvas compositing", () => {
    const markup = buildDrawableSvg({
      kind: "text",
      text: "A",
      width: 10,
      height: 10,
    });
    expect(svgMarkupToDataUrl(markup).startsWith("data:image/svg+xml")).toBe(
      true,
    );
  });
});
