export type Rating = "perfect" | "good" | "ok" | "miss";

// Timing windows (in seconds)
export const PERFECT_WINDOW = 0.05; // ±50ms
export const GOOD_WINDOW = 0.12; // ±120ms
export const OK_WINDOW = 0.2; // ±200ms

export function rateHit(delta: number): Rating {
  const abs = Math.abs(delta);
  if (abs <= PERFECT_WINDOW) return "perfect";
  if (abs <= GOOD_WINDOW) return "good";
  if (abs <= OK_WINDOW) return "ok";
  return "miss";
}

export function scoreForRating(rating: Rating): number {
  switch (rating) {
    case "perfect": return 100;
    case "good": return 60;
    case "ok": return 30;
    case "miss": return 0;
  }
}

export function calculateFinalScore(
  ratings: Rating[],
  totalHits: number,
): number {
  const totalPossible = totalHits * 100;
  const earned = ratings.reduce((sum, r) => sum + scoreForRating(r), 0);
  return totalPossible > 0 ? Math.round((earned / totalPossible) * 100) : 0;
}
