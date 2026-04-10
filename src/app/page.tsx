"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame, type Rating } from "@/hooks/useGame";
import { PATTERNS, type Pattern } from "@/lib/patterns";
import { ensureAudioContext, playDrum, type DrumSound } from "@/lib/drums";
import {
  getAllHighscores,
  getHighscore,
  getStreak,
  saveHighscore,
  updateStreak,
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
  perfect:
    "border-[var(--color-beat-perfect)]/70 bg-[var(--color-beat-perfect)]/16 text-white",
  good:
    "border-[var(--color-beat-good)]/70 bg-[var(--color-beat-good)]/16 text-white",
  ok: "border-[var(--color-beat-ok)]/70 bg-[var(--color-beat-ok)]/16 text-white",
  miss:
    "border-[var(--color-beat-miss)]/70 bg-[var(--color-beat-miss)]/18 text-white",
};

const RATING_LABELS: Record<Rating, string> = {
  perfect: "Perfect",
  good: "Good",
  ok: "Okay",
  miss: "Miss",
};

const KEY_MAP: Record<string, DrumSound> = {
  d: "kick",
  f: "snare",
  j: "hihat",
  D: "kick",
  F: "snare",
  J: "hihat",
};

const PRACTICE_STEPS = [
  "Wähle ein Pattern und höre erst nur zu.",
  "Teste die Pads in Ruhe mit D, F und J.",
  "Starte die Runde und spiele das Muster möglichst exakt nach.",
];

const DIFFICULTY_STARS = (difficulty: number) =>
  "★".repeat(difficulty) + "☆".repeat(5 - difficulty);

function Surface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] border border-white/12 bg-white/6 shadow-[0_24px_120px_rgba(8,15,40,0.45)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

function StagePill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-left">
      <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">
        {label}
      </p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function PatternCard({
  pattern,
  onSelect,
  highscore,
}: {
  pattern: Pattern;
  onSelect: (pattern: Pattern) => void;
  highscore: HighscoreEntry | null;
}) {
  return (
    <button
      onClick={() => onSelect(pattern)}
      className="group flex flex-col gap-3 rounded-[24px] border border-white/10 bg-[#0d1431]/80 px-5 py-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/60 hover:bg-[#121c44] hover:shadow-[0_16px_40px_rgba(56,189,248,0.18)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071020]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">{pattern.name}</p>
          <p className="mt-1 text-sm text-white/55">
            {pattern.hits.length} Treffer · {pattern.bpm} BPM
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-200/80">
            Level
          </span>
          {highscore && (
            <span className="rounded-full border border-[var(--color-beat-good)]/20 bg-[var(--color-beat-good)]/12 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[var(--color-beat-good)]">
              Best {highscore.score}%
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-white/55">
        <span className="font-mono tracking-[0.25em] text-amber-200/80">
          {DIFFICULTY_STARS(pattern.difficulty)}
        </span>
        <span className="transition-transform duration-300 group-hover:translate-x-1">
          Pattern laden →
        </span>
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
  onTap: (sound: DrumSound) => void;
  disabled: boolean;
  flashRating?: Rating | null;
}) {
  const stateClass = disabled
    ? "border-white/6 bg-white/4 text-white/35"
    : flashRating
      ? `${RATING_BG_COLORS[flashRating]} ${flashRating === "perfect" ? "pad-flash-perfect" : ""}`
      : "border-white/12 bg-white/8 text-white hover:-translate-y-1 hover:border-cyan-300/70 hover:bg-cyan-300/12";

  return (
    <button
      onPointerDown={() => !disabled && onTap(sound)}
      disabled={disabled}
      aria-label={`${label} (Taste ${keyHint})`}
      className={`flex h-28 w-24 flex-col items-center justify-center gap-2 rounded-[28px] border text-center transition-all duration-200 active:scale-95 sm:h-32 sm:w-28 ${stateClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071020]`}
    >
      <span className="text-lg font-semibold">{label}</span>
      <span className="rounded-full border border-current/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.28em] text-current/70">
        {keyHint}
      </span>
    </button>
  );
}

function HeroStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Surface className="p-4">
      <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm leading-relaxed text-white/55">{hint}</p>
    </Surface>
  );
}

function StageFrame({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <Surface
      className={`mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-6 sm:px-8 sm:py-8 ${
        compact ? "max-w-2xl" : ""
      }`}
    >
      {children}
    </Surface>
  );
}

export default function Home() {
  const { state, listen, startPlay, tap, reset } = useGame();

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

  const [displayScore, setDisplayScore] = useState(0);
  const [highscores, setHighscores] = useState<Record<string, HighscoreEntry>>(
    {},
  );
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [prevHighscore, setPrevHighscore] = useState<HighscoreEntry | null>(null);
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    lastPlayedDate: "",
    bestStreak: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setHighscores(getAllHighscores());
      setStreak(getStreak());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleTap = useCallback(
    (sound: DrumSound) => {
      tap(sound);
    },
    [tap],
  );

  const prevResultsLength = useRef(0);
  useEffect(() => {
    const newLength = state.results.length;
    if (newLength > prevResultsLength.current) {
      const latest = state.results[newLength - 1];
      if (latest) {
        const sound = latest.hit.sound;
        const rating = latest.rating;

        if (flashTimers.current[sound]) {
          clearTimeout(flashTimers.current[sound]!);
        }

        setFlashRatings((prev) => ({ ...prev, [sound]: rating }));

        flashTimers.current[sound] = setTimeout(() => {
          setFlashRatings((prev) => ({ ...prev, [sound]: null }));
          flashTimers.current[sound] = null;
        }, 220);
      }
    }
    prevResultsLength.current = newLength;
  }, [state.results]);

  useEffect(() => {
    if (state.phase !== "play") {
      const timer = setTimeout(() => {
        setFlashRatings({ kick: null, snare: null, hihat: null });
        prevResultsLength.current = 0;
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "results" || !state.pattern) return;

    const patternId = state.pattern.id;
    const existing = getHighscore(patternId);
    const newRecord = saveHighscore(patternId, state.score, state.maxCombo);
    const updatedStreak = updateStreak();
    const updatedHighscores = getAllHighscores();

    const timer = setTimeout(() => {
      setPrevHighscore(existing);
      setIsNewRecord(newRecord);
      setStreak(updatedStreak);
      setHighscores(updatedHighscores);
    }, 0);

    return () => clearTimeout(timer);
  }, [state.maxCombo, state.pattern, state.phase, state.score]);

  useEffect(() => {
    if (state.phase !== "results") return;

    const target = state.score;
    const duration = 1000;
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

    const resetTimer = setTimeout(() => setDisplayScore(0), 0);
    rafId = requestAnimationFrame(tick);

    return () => {
      clearTimeout(resetTimer);
      cancelAnimationFrame(rafId);
    };
  }, [state.phase, state.score]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === " " && state.phase === "ready") {
        event.preventDefault();
        startPlay();
        return;
      }

      const sound = KEY_MAP[event.key];
      if (!sound) return;

      event.preventDefault();
      if (state.phase === "play") {
        handleTap(sound);
      } else if (state.phase === "ready") {
        ensureAudioContext();
        playDrum(sound);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleTap, startPlay, state.phase]);

  const lastResult = state.results[state.results.length - 1];
  const progress = state.pattern
    ? state.results.length / state.pattern.hits.length
    : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.2),_transparent_35%),radial-gradient(circle_at_80%_20%,_rgba(129,140,248,0.16),_transparent_30%),radial-gradient(circle_at_50%_100%,_rgba(249,115,22,0.12),_transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:120px_120px]" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[140px]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-cyan-200/70">
              Rhythm Memory Trainer
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Beat Match
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StagePill label="Input" value="D / F / J" />
            <StagePill label="Ziel" value="Hören, merken, treffen" />
            {streak.currentStreak > 0 && (
              <StagePill
                label="Streak"
                value={`${streak.currentStreak} Tag${streak.currentStreak === 1 ? "" : "e"}`}
              />
            )}
            {state.phase !== "idle" && (
              <button
                onClick={reset}
                aria-label="Zurück zur Levelauswahl"
                className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071020]"
              >
                Zur Auswahl
              </button>
            )}
          </div>
        </header>

        <main className="flex flex-1">
          {state.phase === "idle" && (
            <div className="grid w-full flex-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <Surface className="flex flex-col justify-between p-6 sm:p-8">
                <div>
                  <span className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-100/80">
                    Browser-Game für Timing & Gehör
                  </span>

                  <h2 className="mt-6 max-w-2xl text-4xl font-semibold leading-[0.95] tracking-tight text-white sm:text-6xl">
                    Hör das Pattern.
                    <br />
                    Spiel es direkt zurück.
                  </h2>

                  <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
                    Beat Match fühlt sich wie ein kleines Arcade-Trainingsdeck an:
                    erst zuhören, dann merken, dann im richtigen Moment treffen.
                    Perfekt für kurze Sessions, Kopfhörer und ein bisschen Ehrgeiz.
                  </p>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <HeroStat
                    label="Timing-Fenster"
                    value="±50 ms"
                    hint="Für Perfect musst du wirklich nah am Beat bleiben."
                  />
                  <HeroStat
                    label="Patterns"
                    value={String(PATTERNS.length)}
                    hint="Von lockerem Einstieg bis konzentrierter Rhythmusprobe."
                  />
                  <HeroStat
                    label="Steuerung"
                    value="D F J"
                    hint="Kick, Snare und Hi-Hat sitzen direkt unter den Fingern."
                  />
                  <HeroStat
                    label="Beste Serie"
                    value={
                      streak.bestStreak > 0
                        ? `${streak.bestStreak} Tag${streak.bestStreak === 1 ? "" : "e"}`
                        : "Neu"
                    }
                    hint="Je öfter du zurückkommst, desto stärker wirkt das Spiel wie Training."
                  />
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <Surface className="p-5">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                      So funktioniert&apos;s
                    </p>
                    <div className="mt-4 space-y-3">
                      {PRACTICE_STEPS.map((step, index) => (
                        <div
                          key={step}
                          className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/10 px-4 py-3"
                        >
                          <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-cyan-200">
                            {index + 1}
                          </span>
                          <p className="text-sm leading-6 text-white/68">{step}</p>
                        </div>
                      ))}
                    </div>
                  </Surface>

                  <Surface className="p-5">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                      Bewertet wird
                    </p>
                    <div className="mt-4 space-y-3">
                      {[
                        ["Perfect", "präzise auf dem Punkt"],
                        ["Good", "klar getroffen"],
                        ["Okay", "leicht daneben, aber noch im Groove"],
                        ["Miss", "zu früh oder zu spät"],
                      ].map(([label, copy]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/10 px-4 py-3"
                        >
                          <span className="font-semibold text-white">{label}</span>
                          <span className="text-sm text-white/55">{copy}</span>
                        </div>
                      ))}
                    </div>
                  </Surface>
                </div>
              </Surface>

              <Surface className="flex flex-col p-5 sm:p-6">
                <div className="mb-5">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                    Wähle dein Level
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">
                    Pattern-Auswahl
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Starte mit einem ruhigeren Beat oder spring direkt in ein
                    schnelleres Pattern. Jeder Run beginnt mit einer Hörphase.
                  </p>
                </div>

                <div className="grid gap-3">
                  {PATTERNS.map((pattern) => (
                    <PatternCard
                      key={pattern.id}
                      pattern={pattern}
                      onSelect={listen}
                      highscore={highscores[pattern.id] ?? null}
                    />
                  ))}
                </div>
              </Surface>
            </div>
          )}

          {state.phase === "listen" && (
            <StageFrame compact>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-8 flex h-40 w-40 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10">
                  <div className="absolute inset-5 rounded-full border border-cyan-200/20" />
                  <div className="absolute inset-0 animate-ping rounded-full border border-cyan-300/10" />
                  <span className="text-sm uppercase tracking-[0.36em] text-cyan-100/75">
                    Listen
                  </span>
                </div>

                <p className="text-[11px] uppercase tracking-[0.3em] text-white/42">
                  Jetzt nur hören
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                  {state.pattern?.name}
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-white/65">
                  Konzentrier dich nur auf das Timing. Danach bekommst du kurz
                  Zeit, die Pads zu testen, bevor dein eigener Versuch startet.
                </p>
              </motion.div>
            </StageFrame>
          )}

          {state.phase === "ready" && (
            <StageFrame>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center"
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/42">
                  Bereit machen
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                  {state.pattern?.name}
                </h2>
                <p className="mt-3 max-w-xl text-base leading-7 text-white/65">
                  Teste die drei Pads kurz an. Wenn alles gut klingt, startet
                  die Runde per Button oder mit der Leertaste.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <StagePill label="Tempo" value={`${state.pattern?.bpm ?? 0} BPM`} />
                  <StagePill
                    label="Treffer"
                    value={`${state.pattern?.hits.length ?? 0} Steps`}
                  />
                  <StagePill
                    label="Schwierigkeit"
                    value={DIFFICULTY_STARS(state.pattern?.difficulty ?? 1)}
                  />
                </div>

                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <DrumPad
                    label="Kick"
                    keyHint="D"
                    sound="kick"
                    onTap={(sound) => {
                      ensureAudioContext();
                      playDrum(sound);
                    }}
                    disabled={false}
                  />
                  <DrumPad
                    label="Snare"
                    keyHint="F"
                    sound="snare"
                    onTap={(sound) => {
                      ensureAudioContext();
                      playDrum(sound);
                    }}
                    disabled={false}
                  />
                  <DrumPad
                    label="Hi-Hat"
                    keyHint="J"
                    sound="hihat"
                    onTap={(sound) => {
                      ensureAudioContext();
                      playDrum(sound);
                    }}
                    disabled={false}
                  />
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => state.pattern && listen(state.pattern)}
                    className="rounded-full border border-white/12 bg-white/6 px-6 py-3 text-sm text-white/72 transition hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071020]"
                  >
                    Pattern noch mal hören
                  </button>
                  <button
                    onClick={startPlay}
                    className="rounded-full bg-cyan-300 px-8 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071020]"
                  >
                    Runde starten
                  </button>
                </div>

                <p className="mt-4 text-xs text-white/42">
                  Tipp: Mit der Leertaste geht es sofort los.
                </p>
              </motion.div>
            </StageFrame>
          )}

          {state.phase === "play" && (
            <StageFrame>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center text-center"
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/42">
                  Dein Versuch läuft
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                  {state.pattern?.name}
                </h2>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <StagePill
                    label="Fortschritt"
                    value={`${state.results.length}/${state.pattern?.hits.length ?? 0}`}
                  />
                  <StagePill label="Tempo" value={`${state.pattern?.bpm ?? 0} BPM`} />
                  <StagePill label="Combo" value={`${state.combo}x`} />
                </div>

                <div className="mt-6 h-2.5 w-full max-w-xl overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 transition-[width] duration-150"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>

                <div className="mt-10 min-h-16">
                  <AnimatePresence mode="wait">
                    {lastResult && (
                      <motion.div
                        key={state.results.length}
                        initial={{ opacity: 0, y: -14, scale: 1.25 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className={`rounded-full border px-5 py-3 text-xl font-semibold shadow-[0_10px_40px_rgba(15,23,42,0.3)] ${RATING_BG_COLORS[lastResult.rating]}`}
                      >
                        {RATING_LABELS[lastResult.rating]}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-2 text-sm text-white/58">
                  {state.combo > 1 && (
                    <span className={state.combo >= 5 ? "combo-glow font-semibold text-white" : ""}>
                      Combo {state.combo}x
                    </span>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  <DrumPad
                    label="Kick"
                    keyHint="D"
                    sound="kick"
                    onTap={handleTap}
                    disabled={false}
                    flashRating={flashRatings.kick}
                  />
                  <DrumPad
                    label="Snare"
                    keyHint="F"
                    sound="snare"
                    onTap={handleTap}
                    disabled={false}
                    flashRating={flashRatings.snare}
                  />
                  <DrumPad
                    label="Hi-Hat"
                    keyHint="J"
                    sound="hihat"
                    onTap={handleTap}
                    disabled={false}
                    flashRating={flashRatings.hihat}
                  />
                </div>
              </motion.div>
            </StageFrame>
          )}

          {state.phase === "results" && (
            <StageFrame compact>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center"
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/42">
                  Runde abgeschlossen
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                  {state.pattern?.name}
                </h2>

                <AnimatePresence>
                  {isNewRecord && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-6 rounded-full border border-[var(--color-beat-good)]/35 bg-[var(--color-beat-good)]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-beat-good)]"
                    >
                      Neuer Highscore
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-8 flex h-44 w-44 items-center justify-center rounded-full border border-white/12 bg-white/6 shadow-[0_0_80px_rgba(34,211,238,0.12)]">
                  <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border border-cyan-300/25 bg-[#0b1330]">
                    <p className="score-reveal text-5xl font-semibold tracking-tight text-white">
                      {displayScore}
                      <span className="text-2xl text-white/55">%</span>
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.28em] text-white/42">
                      Accuracy
                    </p>
                  </div>
                </div>

                {prevHighscore && (
                  <p className="mt-4 text-sm text-white/55">
                    {isNewRecord && prevHighscore.score < state.score
                      ? `Vorher: ${prevHighscore.score}%`
                      : `Bestleistung: ${prevHighscore.score}%`}
                  </p>
                )}

                <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-4">
                  {(["perfect", "good", "ok", "miss"] as const).map((rating) => (
                    <Surface key={rating} className="p-4 text-center">
                      <p className={`text-2xl font-semibold ${RATING_COLORS[rating]}`}>
                        {
                          state.results.filter((result) => result.rating === rating)
                            .length
                        }
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.24em] text-white/42">
                        {RATING_LABELS[rating]}
                      </p>
                    </Surface>
                  ))}
                </div>

                <div className="mt-6 space-y-2 text-sm text-white/58">
                  <p>
                    Max Combo{" "}
                    <span className="font-semibold text-white">{state.maxCombo}x</span>
                  </p>
                  {streak.currentStreak > 1 && (
                    <p className="text-[var(--color-accent)]">
                      {streak.currentStreak} Tage in Folge gespielt.
                    </p>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => state.pattern && listen(state.pattern)}
                    className="rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071020]"
                  >
                    Gleiche Runde noch mal
                  </button>
                  <button
                    onClick={reset}
                    className="rounded-full border border-white/12 bg-white/6 px-6 py-3 text-sm text-white/72 transition hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071020]"
                  >
                    Anderes Pattern
                  </button>
                </div>
              </motion.div>
            </StageFrame>
          )}
        </main>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4 text-xs text-white/42">
          <p>Am besten mit Kopfhörern und direkter Tastatur.</p>
          <p>Kick = D · Snare = F · Hi-Hat = J · Start = Space</p>
        </footer>
      </div>
    </div>
  );
}
