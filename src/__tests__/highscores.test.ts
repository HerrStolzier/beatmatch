import { describe, it, expect, beforeEach } from "vitest";
import {
  saveHighscore,
  getHighscore,
  getAllHighscores,
  updateStreak,
} from "@/lib/highscores";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });
Object.defineProperty(globalThis, "window", { value: globalThis });

beforeEach(() => {
  localStorageMock.clear();
});

// ---- saveHighscore ----

describe("saveHighscore", () => {
  it("saves a new highscore entry and returns true", () => {
    const isNew = saveHighscore("pattern-1", 80, 5);
    expect(isNew).toBe(true);

    const entry = getHighscore("pattern-1");
    expect(entry).not.toBeNull();
    expect(entry!.score).toBe(80);
    expect(entry!.maxCombo).toBe(5);
    expect(entry!.patternId).toBe("pattern-1");
  });

  it("overwrites only if new score is higher", () => {
    saveHighscore("pattern-1", 60, 3);

    const isNew = saveHighscore("pattern-1", 80, 7);
    expect(isNew).toBe(true);
    expect(getHighscore("pattern-1")!.score).toBe(80);
  });

  it("does NOT overwrite if new score is lower or equal", () => {
    saveHighscore("pattern-1", 80, 7);

    const isNew = saveHighscore("pattern-1", 50, 2);
    expect(isNew).toBe(false);
    expect(getHighscore("pattern-1")!.score).toBe(80);

    const isNewEqual = saveHighscore("pattern-1", 80, 9);
    expect(isNewEqual).toBe(false);
    expect(getHighscore("pattern-1")!.score).toBe(80);
  });
});

// ---- getAllHighscores ----

describe("getAllHighscores", () => {
  it("returns empty object when no highscores exist", () => {
    expect(getAllHighscores()).toEqual({});
  });

  it("returns correct map with multiple entries", () => {
    saveHighscore("pattern-1", 70, 4);
    saveHighscore("pattern-2", 90, 8);

    const all = getAllHighscores();
    expect(Object.keys(all)).toHaveLength(2);
    expect(all["pattern-1"].score).toBe(70);
    expect(all["pattern-2"].score).toBe(90);
  });
});

// ---- updateStreak ----

describe("updateStreak", () => {
  it("starts streak at 1 on first play", () => {
    const streak = updateStreak();
    expect(streak.currentStreak).toBe(1);
    expect(streak.bestStreak).toBe(1);
  });

  it("increments streak on consecutive days", () => {
    // Simulate yesterday's play
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    localStorageMock.setItem(
      "beatmatch-streak",
      JSON.stringify({ currentStreak: 3, lastPlayedDate: yesterdayStr, bestStreak: 3 }),
    );

    const streak = updateStreak();
    expect(streak.currentStreak).toBe(4);
    expect(streak.bestStreak).toBe(4);
  });

  it("resets streak to 1 after a gap of more than 1 day", () => {
    // Simulate play 3 days ago
    const old = new Date();
    old.setDate(old.getDate() - 3);
    const oldStr = old.toISOString().slice(0, 10);

    localStorageMock.setItem(
      "beatmatch-streak",
      JSON.stringify({ currentStreak: 5, lastPlayedDate: oldStr, bestStreak: 5 }),
    );

    const streak = updateStreak();
    expect(streak.currentStreak).toBe(1);
    // bestStreak is preserved
    expect(streak.bestStreak).toBe(5);
  });

  it("does not change streak when played twice on the same day", () => {
    const today = new Date().toISOString().slice(0, 10);

    localStorageMock.setItem(
      "beatmatch-streak",
      JSON.stringify({ currentStreak: 2, lastPlayedDate: today, bestStreak: 2 }),
    );

    const streak = updateStreak();
    expect(streak.currentStreak).toBe(2);
  });
});
