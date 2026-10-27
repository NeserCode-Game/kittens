export const RESOURCE_WINDOW_WIDTH = 720;
export const RESOURCE_WINDOW_HEIGHT = 32;

export type ResourceWindowSide = "above" | "below";

export interface PhysicalRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (maximum < minimum) return minimum;
  return Math.min(Math.max(value, minimum), maximum);
}

export function resolveAttachedWindowSide(
  main: PhysicalRect,
  resourceY: number,
  resourceHeight: number
): ResourceWindowSide {
  const aboveY = main.y - resourceHeight;
  const belowY = main.y + main.height;
  return Math.abs(resourceY - aboveY) <= Math.abs(resourceY - belowY)
    ? "above"
    : "below";
}

export function computeAttachedWindowPosition(
  main: PhysicalRect,
  monitor: PhysicalRect,
  resourceWidth: number,
  resourceHeight: number,
  preferredSide: ResourceWindowSide = "above"
): { x: number; y: number } {
  const monitorBottom = monitor.y + monitor.height;
  const monitorRight = monitor.x + monitor.width;
  const x = clamp(
    main.x + (main.width - resourceWidth) / 2,
    monitor.x,
    monitorRight - resourceWidth
  );
  const belowY = main.y + main.height;
  const aboveY = main.y - resourceHeight;
  const aboveFits = aboveY >= monitor.y;
  const belowFits = belowY + resourceHeight <= monitorBottom;

  if (preferredSide === "above" && aboveFits) {
    return { x: Math.round(x), y: aboveY };
  }
  if (preferredSide === "below" && belowFits) {
    return { x: Math.round(x), y: belowY };
  }
  if (aboveFits) {
    return { x: Math.round(x), y: aboveY };
  }
  if (belowFits) {
    return { x: Math.round(x), y: belowY };
  }

  return {
    x: Math.round(x),
    y: clamp(
      preferredSide === "above" ? aboveY : belowY,
      monitor.y,
      monitorBottom - resourceHeight
    ),
  };
}
