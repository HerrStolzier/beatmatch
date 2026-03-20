# Beat Match

**Hear the beat. Tap it back.** A browser-based rhythm game with synthesized drums.

## How to Play

1. Pick a level from the list
2. Listen to the beat pattern
3. Test the drum pads (D = Kick, F = Snare, J = Hi-Hat)
4. Press "Los geht's!" or Spacebar when ready
5. Tap the pattern back as precisely as you can

## Scoring

| Rating | Window | Points |
|--------|--------|--------|
| Perfect | ±50ms | 100 |
| Good | ±120ms | 60 |
| OK | ±200ms | 30 |
| Miss | >200ms | 0 |

## Features

- **8 Progressive Levels** — from simple quarter notes to complex breakbeats
- **Synthesized Drums** — kick, snare, hi-hat generated via Web Audio API (no samples)
- **Precise Timing** — uses AudioContext.currentTime for sub-millisecond accuracy
- **Keyboard + Touch** — D/F/J keys or tap the drum pads
- **Combo Tracking** — keep your streak going for bragging rights

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Web Audio API

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## License

MIT
