"use client";

import { useCallback, useRef, useState } from "react";
import { playDrum, ensureAudioContext, getAudioTime } from "@/lib/drums";
import { beatToSeconds, type Pattern, type BeatHit } from "@/lib/patterns";

// Timing windows (in seconds)
const PERFECT_WINDOW = 0.05; // ±50ms
const GOOD_WINDOW = 0.12; // ±120ms
const OK_WINDOW = 0.2; // ±200ms

export type Rating = "perfect" | "good" | "ok" | "miss";
export type GamePhase = "idle" | "listen" | "countdown" | "play" | "results";

export interface HitResult {
  hit: BeatHit;
  rating: Rating;
  delta: number; // Timing offset in ms (negative = early, positive = late)
}

export interface GameState {
  phase: GamePhase;
  pattern: Pattern | null;
  results: HitResult[];
  score: number;
  combo: number;
  maxCombo: number;
}

function rateHit(delta: number): Rating {
  const abs = Math.abs(delta);
  if (abs <= PERFECT_WINDOW) return "perfect";
  if (abs <= GOOD_WINDOW) return "good";
  if (abs <= OK_WINDOW) return "ok";
  return "miss";
}

function scoreForRating(rating: Rating): number {
  switch (rating) {
    case "perfect": return 100;
    case "good": return 60;
    case "ok": return 30;
    case "miss": return 0;
  }
}

export function useGame() {
  const [state, setState] = useState<GameState>({
    phase: "idle",
    pattern: null,
    results: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
  });

  const playStartRef = useRef(0);
  const unmatchedHitsRef = useRef<BeatHit[]>([]);
  const resultsRef = useRef<HitResult[]>([]);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const patternRef = useRef<Pattern | null>(null);

  // Play the pattern so the user can listen
  const listen = useCallback((pattern: Pattern) => {
    ensureAudioContext();
    patternRef.current = pattern;

    setState((s) => ({
      ...s,
      phase: "listen",
      pattern,
      results: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
    }));

    // Play each hit
    const startTime = getAudioTime() + 0.1;
    for (const hit of pattern.hits) {
      const hitTime = startTime + beatToSeconds(hit.time, pattern.bpm);
      const delay = (hitTime - getAudioTime()) * 1000;
      setTimeout(() => playDrum(hit.sound), Math.max(0, delay));
    }

    // After pattern finishes, switch to countdown
    const patternDuration = beatToSeconds(pattern.beats, pattern.bpm);
    setTimeout(() => {
      setState((s) => ({ ...s, phase: "countdown" }));

      // 3-2-1 countdown then start play phase
      setTimeout(() => startPlay(), 1500);
    }, (patternDuration + 0.3) * 1000);
  }, []);

  const startPlay = useCallback(() => {
    const pattern = patternRef.current;
    if (!pattern) return;

    ensureAudioContext();
    playStartRef.current = getAudioTime() + 0.1;
    unmatchedHitsRef.current = [...pattern.hits];
    resultsRef.current = [];
    comboRef.current = 0;
    maxComboRef.current = 0;

    setState((s) => ({ ...s, phase: "play" }));

    // Play a metronome click at the start
    playDrum("hihat");

    // After pattern duration + grace period, show results
    const duration = beatToSeconds(pattern.beats, pattern.bpm);
    setTimeout(() => finishRound(), (duration + 0.5) * 1000);
  }, []);

  // Handle user input (tap/keypress)
  const tap = useCallback((sound: "kick" | "snare" | "hihat") => {
    if (state.phase !== "play") return;

    const pattern = patternRef.current;
    if (!pattern) return;

    ensureAudioContext();
    playDrum(sound);

    const now = getAudioTime();
    const elapsed = now - playStartRef.current;

    // Find closest unmatched hit of the same sound
    let bestIdx = -1;
    let bestDelta = Infinity;

    for (let i = 0; i < unmatchedHitsRef.current.length; i++) {
      const hit = unmatchedHitsRef.current[i];
      if (hit.sound !== sound) continue;

      const hitTime = beatToSeconds(hit.time, pattern.bpm);
      const delta = elapsed - hitTime;

      if (Math.abs(delta) < Math.abs(bestDelta)) {
        bestDelta = delta;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && Math.abs(bestDelta) <= OK_WINDOW) {
      const hit = unmatchedHitsRef.current[bestIdx];
      unmatchedHitsRef.current.splice(bestIdx, 1);

      const rating = rateHit(bestDelta);
      const result: HitResult = { hit, rating, delta: bestDelta * 1000 };
      resultsRef.current.push(result);

      if (rating !== "miss") {
        comboRef.current++;
        maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
      } else {
        comboRef.current = 0;
      }

      setState((s) => ({
        ...s,
        results: [...resultsRef.current],
        combo: comboRef.current,
        maxCombo: maxComboRef.current,
      }));
    }
  }, [state.phase]);

  const finishRound = useCallback(() => {
    const pattern = patternRef.current;
    if (!pattern) return;

    // Mark remaining unmatched hits as misses
    for (const hit of unmatchedHitsRef.current) {
      resultsRef.current.push({ hit, rating: "miss", delta: 0 });
    }
    unmatchedHitsRef.current = [];

    // Calculate score
    const totalPossible = pattern.hits.length * 100;
    const earned = resultsRef.current.reduce(
      (sum, r) => sum + scoreForRating(r.rating),
      0,
    );
    const score = totalPossible > 0 ? Math.round((earned / totalPossible) * 100) : 0;

    setState((s) => ({
      ...s,
      phase: "results",
      results: [...resultsRef.current],
      score,
      maxCombo: maxComboRef.current,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      phase: "idle",
      pattern: null,
      results: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
    });
  }, []);

  return { state, listen, tap, reset };
}
