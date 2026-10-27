export const RESOURCE_WINDOW_WIDTH = 720;
export const RESOURCE_WINDOW_HEIGHT = 32;

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

export function computeAttachedWindowPosition(
  main: PhysicalRect,
  monitor: PhysicalRect,
  resourceWidth: number,
  resourceHeight: number
): { x: number; y: number } {
  const monitorBottom = monitor.y + monitor.height;
  const monitorRight = monitor.x + monitor.width;
  const x = clamp(
    main.x + (main.width - resourceWidth) / 2,
    monitor.x,
    monitorRight - resourceWidth
  );
  const belowY = main.y + main.height;
  if (belowY + resourceHeight <= monitorBottom) {
    return { x: Math.round(x), y: belowY };
  }

  const aboveY = main.y - resourceHeight;
  if (aboveY >= monitor.y) {
    return { x: Math.round(x), y: aboveY };
  }

  return {
    x: Math.round(x),
    y: clamp(
      belowY - resourceHeight,
      monitor.y,
      monitorBottom - resourceHeight
    ),
  };
}
