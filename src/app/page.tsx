"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame, type Rating } from "@/hooks/useGame";
import { PATTERNS, type Pattern } from "@/lib/patterns";
import { playDrum, ensureAudioContext, type DrumSound } from "@/lib/drums";
import {
  saveHighscore,
  getHighscore,
  getAllHighscores,
  updateStreak,
  getStreak,
  type HighscoreEntry,
  type StreakData,
} from "@/lib/highscores";

const RATING_COLORS: Record<Rating, string> = {
  perfect: "text-[var(--color-beat-perfect)]",
  good: "text-[var(--color-beat-good)]",
  ok: "text-[var(--color-beat-ok)]",
  miss: "text-[var(--color-beat-miss)]",
};

const RATING_BG_COLORS: Record<Rating, string> = {
  perfect: "bg-[var(--color-beat-perfect)]/20 border-[var(--color-beat-perfect)]",
  good: "bg-[var(--color-beat-good)]/20 border-[var(--color-beat-good)]",
  ok: "bg-[var(--color-beat-ok)]/20 border-[var(--color-beat-ok)]",
  miss: "bg-[var(--color-beat-miss)]/20 border-[var(--color-beat-miss)]",
};

const RATING_LABELS: Record<Rating, string> = {
  perfect: "PERFECT",
  good: "GOOD",
  ok: "OK",
  miss: "MISS",
};

const KEY_MAP: Record<string, DrumSound> = {
  d: "kick",
  f: "snare",
  j: "hihat",
  D: "kick",
  F: "snare",
  J: "hihat",
};

const DIFFICULTY_STARS = (d: number) => "★".repeat(d) + "☆".repeat(5 - d);

function PatternCard({
  pattern,
  onSelect,
  highscore,
}: {
  pattern: Pattern;
  onSelect: (p: Pattern) => void;
  highscore: HighscoreEntry | null;
}) {
  return (
    <button
      onClick={() => onSelect(pattern)}
      className="flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4 text-left transition-all hover:scale-[1.02] hover:border-zinc-600 hover:bg-zinc-800/50 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400 focus-visible:outline-none"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-white">{pattern.name}</span>
        {highscore && (
          <span className="text-xs font-bold text-[var(--color-beat-good)] tabular-nums">
            {highscore.score}%
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span>{pattern.bpm} BPM</span>
        <span>{pattern.hits.length} Hits</span>
        <span className="text-amber-400/70">{DIFFICULTY_STARS(pattern.difficulty)}</span>
      </div>
    </button>
  );
}

function DrumPad({
  label,
  keyHint,
  sound,
  onTap,
  disabled,
  flashRating,
}: {
  label: string;
  keyHint: string;
  sound: DrumSound;
  onTap: (s: DrumSound) => void;
  disabled: boolean;
  flashRating?: Rating | null;
}) {
  return (
    <button
      onPointerDown={() => !disabled && onTap(sound)}
      disabled={disabled}
      aria-label={`${label} (Taste ${keyHint})`}
      style={{ width: 100, height: 100, transition: "background-color 200ms, border-color 200ms" }}
      className={`flex flex-col items-center justify-center gap-1 rounded-2xl border-2 active:scale-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400 focus-visible:outline-none ${
        disabled
          ? "border-zinc-800 bg-zinc-900 text-zinc-700"
          : flashRating
          ? `${RATING_BG_COLORS[flashRating]} text-white ${flashRating === "perfect" ? "pad-flash-perfect" : ""}`
          : "border-zinc-600 bg-zinc-800 text-white hover:border-cyan-500 hover:bg-zinc-700 active:border-cyan-400 active:bg-cyan-900/30"
      }`}
    >
      <span className="text-lg font-bold">{label}</span>
      <span className="text-[10px] text-zinc-500">{keyHint}</span>
    </button>
  );
}

export default function Home() {
  const { state, listen, startPlay, tap, reset } = useGame();

  // Flash state: tracks the latest rating per drum sound during play
  const [flashRatings, setFlashRatings] = useState<Record<DrumSound, Rating | null>>({
    kick: null,
    snare: null,
    hihat: null,
  });
  const flashTimers = useRef<Record<DrumSound, ReturnType<typeof setTimeout> | null>>({
    kick: null,
    snare: null,
    hihat: null,
  });

  // Score count-up animation for results
  const [displayScore, setDisplayScore] = useState(0);

  // Highscores
  const [highscores, setHighscores] = useState<Record<string, HighscoreEntry>>({});
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [prevHighscore, setPrevHighscore] = useState<HighscoreEntry | null>(null);
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, lastPlayedDate: "", bestStreak: 0 });

  // Load highscores on mount (client-side only)
  useEffect(() => {
    const t = setTimeout(() => {
      setHighscores(getAllHighscores());
      setStreak(getStreak());
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Wrap tap to also trigger flash
  const handleTap = useCallback(
    (sound: DrumSound) => {
      tap(sound);
      // We'll read the new rating from state.results after tap updates state
      // Use a short delay to let state update propagate
      setTimeout(() => {
        setFlashRatings((prev) => {
          // read latest result from state ref — we schedule a flash clear below
          return prev; // will be updated in the useEffect below
        });
      }, 0);
    },
    [tap],
  );

  // Watch state.results to detect new hits and flash the right pad
  const prevResultsLength = useRef(0);
  useEffect(() => {
    const newLength = state.results.length;
    if (newLength > prevResultsLength.current) {
      const latest = state.results[newLength - 1];
      if (latest) {
        const sound = latest.hit.sound;
        const rating = latest.rating;

        // Clear existing timer for this pad
        if (flashTimers.current[sound]) {
          clearTimeout(flashTimers.current[sound]!);
        }

        // Wrap in setTimeout to avoid synchronous setState inside effect
        const showTimer = setTimeout(() => {
          setFlashRatings((prev) => ({ ...prev, [sound]: rating }));
        }, 0);

        flashTimers.current[sound] = setTimeout(() => {
          setFlashRatings((prev) => ({ ...prev, [sound]: null }));
          flashTimers.current[sound] = null;
        }, 200);

        return () => clearTimeout(showTimer);
      }
    }
    prevResultsLength.current = newLength;
  }, [state.results]);

  // Reset flash state when phase changes away from play
  useEffect(() => {
    if (state.phase !== "play") {
      const t = setTimeout(() => {
        setFlashRatings({ kick: null, snare: null, hihat: null });
        prevResultsLength.current = 0;
      }, 0);
      return () => clearTimeout(t);
    }
  }, [state.phase]);

  // Save highscore and update streak when results appear
  useEffect(() => {
    if (state.phase !== "results" || !state.pattern) return;

    const patternId = state.pattern.id;
    const existing = getHighscore(patternId);
    const newRecord = saveHighscore(patternId, state.score, state.maxCombo);
    const updatedStreak = updateStreak();
    const updatedHighscores = getAllHighscores();

    // Wrap in setTimeout to avoid synchronous setState inside effect (same pattern as rest of codebase)
    const t = setTimeout(() => {
      setPrevHighscore(existing);
      setIsNewRecord(newRecord);
      setStreak(updatedStreak);
      setHighscores(updatedHighscores);
    }, 0);
    return () => clearTimeout(t);
  }, [state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Score count-up animation on results screen
  useEffect(() => {
    if (state.phase !== "results") return;

    const target = state.score;
    const duration = 1000; // ms
    const startTime = performance.now();

    let rafId: number;
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayScore(Math.round(progress * target));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    }

    // Reset to 0 via timer to avoid synchronous setState inside effect
    const resetTimer = setTimeout(() => setDisplayScore(0), 0);
    rafId = requestAnimationFrame(tick);
    return () => {
      clearTimeout(resetTimer);
      cancelAnimationFrame(rafId);
    };
  }, [state.phase, state.score]);

  // Keyboard input
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === " " && state.phase === "ready") {
        e.preventDefault();
        startPlay();
        return;
      }
      const sound = KEY_MAP[e.key];
      if (sound) {
        e.preventDefault();
        if (state.phase === "play") {
          handleTap(sound);
        } else if (state.phase === "ready") {
          ensureAudioContext();
          playDrum(sound);
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleTap, startPlay, state.phase]);

  const lastResult = state.results[state.results.length - 1];

  return (
    <div className="flex min-h-screen flex-col items-center bg-black text-white">
      {/* Header */}
      <header className="flex w-full items-center justify-between px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">Beat Match</h1>
        {state.phase !== "idle" && (
          <button
            onClick={reset}
            aria-label="Zurück zur Levelauswahl"
            className="text-xs text-zinc-500 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400 focus-visible:outline-none rounded"
          >
            Zurück
          </button>
        )}
      </header>

      <main className="flex w-full max-w-lg flex-1 flex-col items-center px-6">
        {/* IDLE: Level Selection */}
        {state.phase === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full flex-col gap-6"
          >
            <div className="text-center">
              <p className="text-sm text-zinc-400">
                Höre das Pattern, dann klopfe es nach.
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Tastatur: D=Kick, F=Snare, J=Hi-Hat
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {PATTERNS.map((p) => (
                <PatternCard key={p.id} pattern={p} onSelect={listen} highscore={highscores[p.id] ?? null} />
              ))}
            </div>
          </motion.div>
        )}

        {/* LISTEN: Playing the pattern */}
        {state.phase === "listen" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-1 flex-col items-center justify-center gap-4"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-cyan-500/50">
              <span className="text-3xl">👂</span>
            </div>
            <p className="text-lg font-medium text-cyan-400">Zuhören...</p>
            <p className="text-sm text-zinc-500">{state.pattern?.name}</p>
          </motion.div>
        )}

        {/* READY: User starts manually */}
        {state.phase === "ready" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col items-center justify-center gap-6"
          >
            <p className="text-sm text-zinc-400">{state.pattern?.name}</p>

            {/* Try the drums */}
            <div className="flex gap-4">
              <DrumPad label="Kick" keyHint="D" sound="kick" onTap={(s) => { ensureAudioContext(); playDrum(s); }} disabled={false} />
              <DrumPad label="Snare" keyHint="F" sound="snare" onTap={(s) => { ensureAudioContext(); playDrum(s); }} disabled={false} />
              <DrumPad label="Hi-Hat" keyHint="J" sound="hihat" onTap={(s) => { ensureAudioContext(); playDrum(s); }} disabled={false} />
            </div>

            {/* Replay pattern button */}
            <button
              onClick={() => state.pattern && listen(state.pattern)}
              className="rounded-full border border-zinc-700 px-6 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400 focus-visible:outline-none"
            >
              Nochmal hören
            </button>

            <button
              onClick={startPlay}
              className="rounded-full bg-cyan-500 px-10 py-4 text-lg font-bold text-black transition-all hover:scale-105 hover:bg-cyan-400 active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400 focus-visible:outline-none"
            >
              Los geht&apos;s!
            </button>
            <p className="text-xs text-zinc-600">oder Leertaste drücken</p>
          </motion.div>
        )}

        {/* PLAY: User tapping */}
        {state.phase === "play" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-1 flex-col items-center justify-center gap-8"
          >
            {/* Combo + last rating */}
            <div className="flex flex-col items-center gap-2">
              <AnimatePresence mode="wait">
                {lastResult && (
                  <motion.p
                    key={state.results.length}
                    initial={{ opacity: 0, y: -10, scale: 1.5 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className={`text-2xl font-black ${RATING_COLORS[lastResult.rating]}`}
                  >
                    {RATING_LABELS[lastResult.rating]}
                  </motion.p>
                )}
              </AnimatePresence>
              {state.combo > 1 && (
                <p className="text-sm text-zinc-500">
                  Combo:{" "}
                  <span className={`font-bold text-white ${state.combo >= 5 ? "combo-glow" : ""}`}>
                    {state.combo}x
                  </span>
                </p>
              )}
            </div>

            {/* Drum Pads */}
            <div className="flex gap-4">
              <DrumPad label="Kick" keyHint="D" sound="kick" onTap={handleTap} disabled={false} flashRating={flashRatings.kick} />
              <DrumPad label="Snare" keyHint="F" sound="snare" onTap={handleTap} disabled={false} flashRating={flashRatings.snare} />
              <DrumPad label="Hi-Hat" keyHint="J" sound="hihat" onTap={handleTap} disabled={false} flashRating={flashRatings.hihat} />
            </div>

            {/* Progress indicator */}
            <p className="text-sm text-zinc-400">
              Hit{" "}
              <span className="font-bold text-white">{state.results.length}</span>
              /
              <span className="font-bold text-white">{state.pattern?.hits.length ?? 0}</span>
            </p>

            <p className="text-xs text-zinc-600">
              {state.pattern?.name} — {state.pattern?.bpm} BPM
            </p>
          </motion.div>
        )}

        {/* RESULTS */}
        {state.phase === "results" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col items-center justify-center gap-6"
          >
            <p className="text-sm text-zinc-400">{state.pattern?.name}</p>

            {/* New Record Banner */}
            <AnimatePresence>
              {isNewRecord && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 rounded-full bg-[var(--color-beat-good)]/20 border border-[var(--color-beat-good)]/40 px-4 py-1.5"
                >
                  <span className="text-xs font-bold text-[var(--color-beat-good)] uppercase tracking-widest">
                    Neuer Highscore!
                  </span>
                  <span className="text-xs">
                    {["✦", "✧", "✦"].map((s, i) => (
                      <motion.span
                        key={i}
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                        className="inline-block"
                      >
                        {s}
                      </motion.span>
                    ))}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-center">
              <p className="score-reveal text-6xl font-black tabular-nums text-white">
                {displayScore}%
              </p>
              <p className="mt-1 text-sm text-zinc-500">Genauigkeit</p>
              {/* Previous highscore comparison */}
              {prevHighscore && !isNewRecord && (
                <p className="mt-1 text-xs text-zinc-600">
                  Bestleistung: <span className="text-zinc-400">{prevHighscore.score}%</span>
                </p>
              )}
              {prevHighscore && isNewRecord && prevHighscore.score < state.score && (
                <p className="mt-1 text-xs text-zinc-600">
                  Vorher: <span className="text-zinc-400 line-through">{prevHighscore.score}%</span>
                </p>
              )}
            </div>

            {/* Stats with theme colors */}
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-lg font-bold text-[var(--color-beat-perfect)]">
                  {state.results.filter((r) => r.rating === "perfect").length}
                </p>
                <p className="text-[10px] uppercase text-zinc-600">Perfect</p>
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--color-beat-good)]">
                  {state.results.filter((r) => r.rating === "good").length}
                </p>
                <p className="text-[10px] uppercase text-zinc-600">Good</p>
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--color-beat-ok)]">
                  {state.results.filter((r) => r.rating === "ok").length}
                </p>
                <p className="text-[10px] uppercase text-zinc-600">OK</p>
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--color-beat-miss)]">
                  {state.results.filter((r) => r.rating === "miss").length}
                </p>
                <p className="text-[10px] uppercase text-zinc-600">Miss</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <p className="text-sm text-zinc-500">
                Max Combo: <span className="font-bold text-white">{state.maxCombo}x</span>
              </p>
              {streak.currentStreak > 1 && (
                <p className="text-xs text-[var(--color-accent)]">
                  {streak.currentStreak} Tage in Folge!
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => state.pattern && listen(state.pattern)}
                className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400 focus-visible:outline-none"
              >
                Nochmal
              </button>
              <button
                onClick={reset}
                className="rounded-full border border-zinc-700 px-6 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400 focus-visible:outline-none"
              >
                Andere Level
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
