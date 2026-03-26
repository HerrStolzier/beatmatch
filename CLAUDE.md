# Beatmatch

Rhythm game — hear a beat, tap it back. Test your timing with synthesized drums.

## Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion
- **Audio:** Web Audio API (synthesized drums, no samples)
- **Hosting:** Vercel
- **Package Manager:** pnpm

## Commands
- `pnpm dev` — Start dev server (localhost:3000)
- `pnpm build` — Production build
- `pnpm lint` — ESLint

## Architecture
- `src/app/page.tsx` — Game UI (client component, all phases: idle → listen → ready → play → results)
- `src/hooks/useGame.ts` — Game state machine, timing logic, scoring
- `src/lib/drums.ts` — Web Audio API drum synthesizer (kick, snare, hi-hat)
- `src/lib/patterns.ts` — 8 drum patterns with progressive difficulty (1-5 stars)

## Key Files
- `src/hooks/useGame.ts` — State machine mit Refs für timing-kritische Daten. Timing-Fenster: Perfect ±50ms, Good ±120ms, OK ±200ms, Miss >200ms. Scoring: Perfect=100, Good=60, OK=30, Miss=0.
- `src/lib/drums.ts` — Reine Synthese: Kick (Sinus-Sweep 150→40Hz), Snare (White Noise + Bandpass), Hi-Hat (Highpass 7kHz Noise). Kein Sample-Loading.
- `src/app/page.tsx` — Keyboard: D=Kick, F=Snare, J=Hi-Hat, Space=Start. PatternCard + DrumPad Komponenten inline.

## Conventions
- German UI text, English code/comments
- Timing über `AudioContext.currentTime` (nicht setTimeout — zu ungenau für Rhythmus)
- Refs statt useState für timing-kritische State-Verwaltung (vermeidet Re-Render-Delays)
- Framer Motion `AnimatePresence` mode="wait" für Phase-Übergänge

## Gotchas
- **Next.js 16 Breaking Changes:** APIs und Conventions haben sich geändert — bei Unklarheit `node_modules/next/dist/docs/` lesen (siehe AGENTS.md)
- **AudioContext Resume:** iOS/Safari blockieren Audio ohne User-Geste — `ensureAudioContext()` wird bei jedem Button-Click und Keypress aufgerufen
- **Keyboard Events:** `e.preventDefault()` auf D/F/J (sonst Browser-Defaults) und Space (sonst Page Scroll)
- **Tests:** Vitest — `pnpm test`. Scoring-Logik in `src/lib/scoring.ts` extrahiert und mit 20 Tests abgedeckt.
- **CI:** GitHub Actions — lint + tsc + test + build
- **Pre-commit:** Husky — `pnpm lint`
