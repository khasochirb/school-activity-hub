export const MOTION_FAST_MS = 120;
export const MOTION_NORMAL_MS = 180;
export const MOTION_LARGE_MS = 240;

export function motionDuration(duration: number) {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return 0;
  }

  return duration;
}
