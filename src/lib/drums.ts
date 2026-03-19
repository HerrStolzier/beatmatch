// Synthesized drum sounds using Web Audio API — no samples needed

let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function playKick() {
  const c = getContext();
  const t = c.currentTime;

  // Oscillator: sine wave with fast frequency sweep
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);

  // Gain envelope: sharp attack, medium decay
  const gain = c.createGain();
  gain.gain.setValueAtTime(1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.35);
}

export function playSnare() {
  const c = getContext();
  const t = c.currentTime;

  // Noise burst
  const bufferSize = c.sampleRate * 0.15;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = c.createBufferSource();
  noise.buffer = buffer;

  const noiseFilter = c.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 3000;
  noiseFilter.Q.value = 0.7;

  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.8, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(c.destination);
  noise.start(t);

  // Tone body
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = 180;

  const oscGain = c.createGain();
  oscGain.gain.setValueAtTime(0.5, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

  osc.connect(oscGain);
  oscGain.connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.08);
}

export function playHihat() {
  const c = getContext();
  const t = c.currentTime;

  const bufferSize = c.sampleRate * 0.05;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = c.createBufferSource();
  noise.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7000;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  noise.start(t);
}

export type DrumSound = "kick" | "snare" | "hihat";

const players: Record<DrumSound, () => void> = {
  kick: playKick,
  snare: playSnare,
  hihat: playHihat,
};

export function playDrum(sound: DrumSound) {
  players[sound]();
}

// Schedule a drum hit at a specific AudioContext time
export function scheduleDrum(sound: DrumSound, time: number) {
  const c = getContext();
  const delay = Math.max(0, time - c.currentTime);
  setTimeout(() => playDrum(sound), delay * 1000);
}

export function getAudioTime(): number {
  return getContext().currentTime;
}

export function ensureAudioContext() {
  getContext();
}
