export const COMPOSITION_WIDTH = 1920;
export const COMPOSITION_HEIGHT = 1080;

export const COMPOSITION_ORIGIN_X = 0;
export const COMPOSITION_ORIGIN_Y = 0;

export const COMPOSITION_AXIS_X_INCREASES = "right" as const;
export const COMPOSITION_AXIS_Y_INCREASES = "down" as const;

export const COMPOSITION_DEFAULT_CENTER_X = COMPOSITION_WIDTH / 2;
export const COMPOSITION_DEFAULT_CENTER_Y = COMPOSITION_HEIGHT / 2;

export type CompositionCenter = {
  x: number;
  y: number;
};

export function normalizeCompositionCenter(
  center: CompositionCenter,
): CompositionCenter | null {
  if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) {
    return null;
  }
  return { x: center.x, y: center.y };
}
