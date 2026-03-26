import { describe, it, expect } from "vitest";
import {
  rateHit,
  scoreForRating,
  calculateFinalScore,
  PERFECT_WINDOW,
  GOOD_WINDOW,
  OK_WINDOW,
  type Rating,
} from "@/lib/scoring";
import { PATTERNS } from "@/lib/patterns";

// ---- rateHit ----

describe("rateHit — timing windows", () => {
  it("rates a hit within ±50ms as perfect", () => {
    expect(rateHit(0)).toBe("perfect");
    expect(rateHit(PERFECT_WINDOW)).toBe("perfect");
    expect(rateHit(-PERFECT_WINDOW)).toBe("perfect");
    expect(rateHit(0.049)).toBe("perfect");
  });

  it("rates a hit within ±120ms (but outside ±50ms) as good", () => {
    expect(rateHit(0.051)).toBe("good");
    expect(rateHit(-0.051)).toBe("good");
    expect(rateHit(GOOD_WINDOW)).toBe("good");
    expect(rateHit(-GOOD_WINDOW)).toBe("good");
  });

  it("rates a hit within ±200ms (but outside ±120ms) as ok", () => {
    expect(rateHit(0.121)).toBe("ok");
    expect(rateHit(-0.121)).toBe("ok");
    expect(rateHit(OK_WINDOW)).toBe("ok");
    expect(rateHit(-OK_WINDOW)).toBe("ok");
  });

  it("rates a hit beyond ±200ms as miss", () => {
    expect(rateHit(0.201)).toBe("miss");
    expect(rateHit(-0.201)).toBe("miss");
    expect(rateHit(1.0)).toBe("miss");
  });
});

// ---- scoreForRating ----

describe("scoreForRating — points per rating", () => {
  it("returns 100 for perfect", () => {
    expect(scoreForRating("perfect")).toBe(100);
  });

  it("returns 60 for good", () => {
    expect(scoreForRating("good")).toBe(60);
  });

  it("returns 30 for ok", () => {
    expect(scoreForRating("ok")).toBe(30);
  });

  it("returns 0 for miss", () => {
    expect(scoreForRating("miss")).toBe(0);
  });
});

// ---- calculateFinalScore ----

describe("calculateFinalScore — percentage calculation", () => {
  it("returns 100% for all perfect hits", () => {
    const ratings: Rating[] = ["perfect", "perfect", "perfect", "perfect"];
    expect(calculateFinalScore(ratings, 4)).toBe(100);
  });

  it("returns 0% for all misses", () => {
    const ratings: Rating[] = ["miss", "miss", "miss"];
    expect(calculateFinalScore(ratings, 3)).toBe(0);
  });

  it("returns 60% for all good hits", () => {
    const ratings: Rating[] = ["good", "good"];
    expect(calculateFinalScore(ratings, 2)).toBe(60);
  });

  it("returns correct mixed score", () => {
    // 1 perfect (100) + 1 miss (0) out of 2 hits (200 possible) = 50%
    const ratings: Rating[] = ["perfect", "miss"];
    expect(calculateFinalScore(ratings, 2)).toBe(50);
  });

  it("returns 0% when totalHits is 0", () => {
    expect(calculateFinalScore([], 0)).toBe(0);
  });
});

// ---- Combo logic simulation ----

describe("combo counting logic", () => {
  it("increments combo on consecutive non-miss hits", () => {
    const ratings: Rating[] = ["perfect", "good", "ok", "perfect"];
    let combo = 0;
    let maxCombo = 0;
    for (const rating of ratings) {
      if (rating !== "miss") {
        combo++;
        maxCombo = Math.max(maxCombo, combo);
      } else {
        combo = 0;
      }
    }
    expect(combo).toBe(4);
    expect(maxCombo).toBe(4);
  });

  it("resets combo on miss", () => {
    const ratings: Rating[] = ["perfect", "perfect", "miss", "good"];
    let combo = 0;
    let maxCombo = 0;
    for (const rating of ratings) {
      if (rating !== "miss") {
        combo++;
        maxCombo = Math.max(maxCombo, combo);
      } else {
        combo = 0;
      }
    }
    expect(combo).toBe(1);
    expect(maxCombo).toBe(2);
  });

  it("tracks max combo across resets", () => {
    const ratings: Rating[] = ["perfect", "perfect", "perfect", "miss", "good", "good"];
    let combo = 0;
    let maxCombo = 0;
    for (const rating of ratings) {
      if (rating !== "miss") {
        combo++;
        maxCombo = Math.max(maxCombo, combo);
      } else {
        combo = 0;
      }
    }
    expect(maxCombo).toBe(3);
    expect(combo).toBe(2);
  });
});

// ---- PATTERNS structure validation ----

describe("PATTERNS — data structure integrity", () => {
  it("every pattern has required fields", () => {
    for (const pattern of PATTERNS) {
      expect(pattern.id).toBeTruthy();
      expect(pattern.name).toBeTruthy();
      expect(typeof pattern.bpm).toBe("number");
      expect(typeof pattern.beats).toBe("number");
      expect([1, 2, 3, 4, 5]).toContain(pattern.difficulty);
      expect(Array.isArray(pattern.hits)).toBe(true);
      expect(pattern.hits.length).toBeGreaterThan(0);
    }
  });

  it("every hit has valid time and sound", () => {
    for (const pattern of PATTERNS) {
      for (const hit of pattern.hits) {
        expect(typeof hit.time).toBe("number");
        expect(hit.time).toBeGreaterThanOrEqual(0);
        expect(hit.time).toBeLessThan(pattern.beats);
        expect(["kick", "snare", "hihat"]).toContain(hit.sound);
      }
    }
  });

  it("has 8 patterns", () => {
    expect(PATTERNS).toHaveLength(8);
  });

  it("patterns have increasing or varied difficulty", () => {
    const difficulties = PATTERNS.map((p) => p.difficulty);
    // At least difficulty 1 and difficulty 5 exist
    expect(difficulties).toContain(1);
    expect(difficulties).toContain(5);
  });
});
