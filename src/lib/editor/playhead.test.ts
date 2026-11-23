import { describe, expect, test } from "vitest";
import { createDefaultTrackProperties } from "./properties";
import {
  activeClipAtPlayhead,
  maxPlayheadFrames,
  maxTimelineFrames,
} from "./playhead";
import type { ClipNode, Project } from "./types";

function projectWithClips(): { project: Project; first: ClipNode } {
  const first: ClipNode = {
    properties: new Map<string, unknown>([
      ["path", "blob:first"],
      ["name", "first.mp4"],
      ["durationFrames", 30],
    ]),
  };
  const second: ClipNode = {
    properties: new Map<string, unknown>([
      ["path", "blob:second"],
      ["name", "second.mp4"],
      ["durationFrames", 15],
    ]),
  };
  return {
    first,
    project: {
      info: { fps: 30 },
      tracks: [
        {
          items: [first, { space: 10 }, second],
          properties: createDefaultTrackProperties(),
        },
      ],
    },
  };
}

describe("playhead helpers", () => {
  test("maxTimelineFrames and maxPlayheadFrames track the longest track", () => {
    const { project } = projectWithClips();
    expect(maxTimelineFrames(project)).toBe(55);
    expect(maxPlayheadFrames(project)).toBe(110);
  });

  test("activeClipAtPlayhead reports media time inside the hit clip", () => {
    const { project } = projectWithClips();
    expect(activeClipAtPlayhead(project, 0)?.path).toBe("blob:first");
    expect(activeClipAtPlayhead(project, 20)?.mediaTimeSeconds).toBeCloseTo(
      10 / 30,
      5,
    );
    expect(activeClipAtPlayhead(project, 70)).toBeNull();
    expect(activeClipAtPlayhead(project, 90)?.path).toBe("blob:second");
    expect(activeClipAtPlayhead(project, 90)?.mediaTimeSeconds).toBeCloseTo(
      5 / 30,
      5,
    );
  });
});
