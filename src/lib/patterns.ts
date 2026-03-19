import type { DrumSound } from "./drums";

export interface BeatHit {
  time: number; // Beat position (0-based, in beats)
  sound: DrumSound;
}

export interface Pattern {
  id: string;
  name: string;
  bpm: number;
  beats: number; // Total beats in pattern
  hits: BeatHit[];
  difficulty: 1 | 2 | 3 | 4 | 5;
}

// Convert beat position to seconds
export function beatToSeconds(beat: number, bpm: number): number {
  return (beat / bpm) * 60;
}

// Built-in levels — progressive difficulty
export const PATTERNS: Pattern[] = [
  {
    id: "four-on-floor",
    name: "Vier auf den Boden",
    bpm: 100,
    beats: 4,
    difficulty: 1,
    hits: [
      { time: 0, sound: "kick" },
      { time: 1, sound: "kick" },
      { time: 2, sound: "kick" },
      { time: 3, sound: "kick" },
    ],
  },
  {
    id: "basic-rock",
    name: "Basic Rock",
    bpm: 100,
    beats: 4,
    difficulty: 1,
    hits: [
      { time: 0, sound: "kick" },
      { time: 1, sound: "snare" },
      { time: 2, sound: "kick" },
      { time: 3, sound: "snare" },
    ],
  },
  {
    id: "hihats",
    name: "Hi-Hat Groove",
    bpm: 100,
    beats: 4,
    difficulty: 2,
    hits: [
      { time: 0, sound: "kick" },
      { time: 0.5, sound: "hihat" },
      { time: 1, sound: "snare" },
      { time: 1.5, sound: "hihat" },
      { time: 2, sound: "kick" },
      { time: 2.5, sound: "hihat" },
      { time: 3, sound: "snare" },
      { time: 3.5, sound: "hihat" },
    ],
  },
  {
    id: "offbeat",
    name: "Offbeat Kick",
    bpm: 110,
    beats: 4,
    difficulty: 2,
    hits: [
      { time: 0, sound: "kick" },
      { time: 0.5, sound: "hihat" },
      { time: 1, sound: "snare" },
      { time: 1.5, sound: "kick" },
      { time: 2, sound: "hihat" },
      { time: 2.5, sound: "hihat" },
      { time: 3, sound: "snare" },
      { time: 3.5, sound: "hihat" },
    ],
  },
  {
    id: "shuffle",
    name: "Shuffle Beat",
    bpm: 95,
    beats: 4,
    difficulty: 3,
    hits: [
      { time: 0, sound: "kick" },
      { time: 0.67, sound: "hihat" },
      { time: 1, sound: "snare" },
      { time: 1.67, sound: "hihat" },
      { time: 2, sound: "kick" },
      { time: 2.33, sound: "kick" },
      { time: 2.67, sound: "hihat" },
      { time: 3, sound: "snare" },
      { time: 3.67, sound: "hihat" },
    ],
  },
  {
    id: "syncopation",
    name: "Synkopen",
    bpm: 105,
    beats: 4,
    difficulty: 3,
    hits: [
      { time: 0, sound: "kick" },
      { time: 0.75, sound: "snare" },
      { time: 1.5, sound: "kick" },
      { time: 2, sound: "snare" },
      { time: 2.5, sound: "hihat" },
      { time: 3, sound: "kick" },
      { time: 3.25, sound: "hihat" },
      { time: 3.5, sound: "snare" },
    ],
  },
  {
    id: "funk",
    name: "Funk Groove",
    bpm: 100,
    beats: 4,
    difficulty: 4,
    hits: [
      { time: 0, sound: "kick" },
      { time: 0.25, sound: "hihat" },
      { time: 0.75, sound: "hihat" },
      { time: 1, sound: "snare" },
      { time: 1.5, sound: "hihat" },
      { time: 1.75, sound: "kick" },
      { time: 2, sound: "hihat" },
      { time: 2.5, sound: "kick" },
      { time: 2.75, sound: "hihat" },
      { time: 3, sound: "snare" },
      { time: 3.5, sound: "hihat" },
      { time: 3.75, sound: "hihat" },
    ],
  },
  {
    id: "breakbeat",
    name: "Breakbeat",
    bpm: 120,
    beats: 4,
    difficulty: 5,
    hits: [
      { time: 0, sound: "kick" },
      { time: 0.25, sound: "hihat" },
      { time: 0.5, sound: "hihat" },
      { time: 0.75, sound: "snare" },
      { time: 1, sound: "hihat" },
      { time: 1.25, sound: "kick" },
      { time: 1.5, sound: "snare" },
      { time: 1.75, sound: "hihat" },
      { time: 2, sound: "kick" },
      { time: 2.25, sound: "hihat" },
      { time: 2.5, sound: "kick" },
      { time: 2.75, sound: "snare" },
      { time: 3, sound: "hihat" },
      { time: 3.25, sound: "hihat" },
      { time: 3.5, sound: "snare" },
      { time: 3.75, sound: "kick" },
    ],
  },
];
