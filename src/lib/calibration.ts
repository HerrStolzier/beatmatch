// Calibration offset for audio latency compensation.
// Stored in localStorage so it persists across sessions.
// Positive value = user taps late (compensate by making windows earlier)
// Negative value = user taps early

const STORAGE_KEY = "beatmatch-calibration";

export function getCalibrationOffset(): number {
  if (typeof window === "undefined") return 0;
  return parseFloat(localStorage.getItem(STORAGE_KEY) ?? "0");
}

export function setCalibrationOffset(ms: number): void {
  localStorage.setItem(STORAGE_KEY, String(ms));
}
