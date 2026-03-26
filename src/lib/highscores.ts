// Highscore and streak tracking — persisted in localStorage

const HIGHSCORES_KEY = "beatmatch-highscores";
const STREAK_KEY = "beatmatch-streak";

export interface HighscoreEntry {
  patternId: string;
  score: number;
  maxCombo: number;
  date: string; // ISO date string
}

export interface StreakData {
  currentStreak: number;
  lastPlayedDate: string; // YYYY-MM-DD
  bestStreak: number;
}

// ---- Helpers ----

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

// ---- Highscores ----

export function getAllHighscores(): Record<string, HighscoreEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(HIGHSCORES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, HighscoreEntry>) : {};
  } catch {
    return {};
  }
}

export function getHighscore(patternId: string): HighscoreEntry | null {
  const all = getAllHighscores();
  return all[patternId] ?? null;
}

/**
 * Save a highscore for the given pattern.
 * Returns true if this is a new personal record (score improved).
 */
export function saveHighscore(
  patternId: string,
  score: number,
  maxCombo: number,
): boolean {
  if (typeof window === "undefined") return false;

  const all = getAllHighscores();
  const existing = all[patternId];

  const isNewRecord = !existing || score > existing.score;

  if (isNewRecord) {
    all[patternId] = {
      patternId,
      score,
      maxCombo,
      date: new Date().toISOString(),
    };
    localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(all));
  }

  return isNewRecord;
}

// ---- Streaks ----

/**
 * Call after each completed game.
 * Updates the streak: consecutive days played.
 * Returns the updated StreakData.
 */
export function updateStreak(): StreakData {
  if (typeof window === "undefined") {
    return { currentStreak: 0, lastPlayedDate: "", bestStreak: 0 };
  }

  const today = todayString();

  let streak: StreakData;
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    streak = raw
      ? (JSON.parse(raw) as StreakData)
      : { currentStreak: 0, lastPlayedDate: "", bestStreak: 0 };
  } catch {
    streak = { currentStreak: 0, lastPlayedDate: "", bestStreak: 0 };
  }

  const diff = streak.lastPlayedDate ? daysBetween(streak.lastPlayedDate, today) : -1;

  if (diff === 0) {
    // Already played today — no change
  } else if (diff === 1) {
    // Consecutive day
    streak.currentStreak += 1;
  } else {
    // Gap or first play
    streak.currentStreak = 1;
  }

  streak.lastPlayedDate = today;
  streak.bestStreak = Math.max(streak.bestStreak, streak.currentStreak);

  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  return streak;
}

export function getStreak(): StreakData {
  if (typeof window === "undefined") {
    return { currentStreak: 0, lastPlayedDate: "", bestStreak: 0 };
  }
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw
      ? (JSON.parse(raw) as StreakData)
      : { currentStreak: 0, lastPlayedDate: "", bestStreak: 0 };
  } catch {
    return { currentStreak: 0, lastPlayedDate: "", bestStreak: 0 };
  }
}
