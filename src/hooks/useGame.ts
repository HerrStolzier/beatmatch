"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playDrum, ensureAudioContext, getAudioTime } from "@/lib/drums";
import { beatToSeconds, type Pattern, type BeatHit } from "@/lib/patterns";
import { rateHit, calculateFinalScore, OK_WINDOW, type Rating } from "@/lib/scoring";
import { getCalibrationOffset } from "@/lib/calibration";

// Note on setTimeout usage:
// - Beat scheduling during "listen" phase uses setTimeout only for playDrum calls
//   that are already AudioContext-time-aligned (delay = audioContextTime - now).
//   This is acceptable: the actual sound scheduling happens via WebAudio, setTimeout
//   just triggers the call slightly ahead of time.
// - Phase transitions (listen→ready, play→results) use setTimeout for UI-only delays.
//   These are not timing-critical and do not affect scoring accuracy.

export type { Rating };
export type GamePhase = "idle" | "listen" | "ready" | "play" | "results";

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

  // Use a ref so startPlay can call finishRound without forward-reference issues
  const finishRoundRef = useRef<() => void>(() => undefined);

  const finishRound = useCallback(() => {
    const pattern = patternRef.current;
    if (!pattern) return;

    // Mark remaining unmatched hits as misses
    for (const hit of unmatchedHitsRef.current) {
      resultsRef.current.push({ hit, rating: "miss", delta: 0 });
    }
    unmatchedHitsRef.current = [];

    // Calculate score using the shared scoring function
    const score = calculateFinalScore(
      resultsRef.current.map((r) => r.rating),
      pattern.hits.length,
    );

    setState((s) => ({
      ...s,
      phase: "results",
      results: [...resultsRef.current],
      score,
      maxCombo: maxComboRef.current,
    }));
  }, []);

  // Keep finishRoundRef in sync so startPlay can call it without dependency issues
  useEffect(() => {
    finishRoundRef.current = finishRound;
  }, [finishRound]);

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

    // After pattern finishes, switch to ready (user starts manually)
    const patternDuration = beatToSeconds(pattern.beats, pattern.bpm);
    setTimeout(() => {
      setState((s) => ({ ...s, phase: "ready" }));
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
    setTimeout(() => finishRoundRef.current(), (duration + 0.5) * 1000);
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

      // Apply calibration offset: subtract latency compensation (in seconds)
      const calibrationOffsetSec = getCalibrationOffset() / 1000;
      const adjustedDelta = bestDelta - calibrationOffsetSec;
      const rating = rateHit(adjustedDelta);
      const result: HitResult = { hit, rating, delta: adjustedDelta * 1000 };
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

  return { state, listen, startPlay, tap, reset };
}
