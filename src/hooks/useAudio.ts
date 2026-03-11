'use client';

import { useCallback, useRef } from 'react';

type SoundName = 'ding' | 'buzzer' | 'tick' | 'win' | 'whoosh' | 'streak' | 'bingo' | 'wheelLand' | 'surprise' | 'rankUp' | 'cellBreak';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playWhoosh() {
  const ctx = getCtx();
  const duration = 0.25;
  const now = ctx.currentTime;

  // White noise burst
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.6;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // Bandpass filter sweep high → low
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(3000, now);
  filter.frequency.exponentialRampToValueAtTime(300, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration);
}

function playTick() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 800;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

function playDing() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Two-tone ascending chime: C5 → E5
  const freqs = [523.25, 659.25];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.12;
    gain.gain.setValueAtTime(0.3, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

function playBuzzer() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 150;

  const osc2 = ctx.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.value = 155; // slight detune for "buzz"

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc2.start(now);
  osc.stop(now + 0.3);
  osc2.stop(now + 0.3);
}

function playWin() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Ascending arpeggio: C5 → E5 → G5 → C6
  const freqs = [523.25, 659.25, 783.99, 1046.5];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.2;
    const dur = 1.5 - i * 0.2;
    gain.gain.setValueAtTime(0.25, start);
    gain.gain.setValueAtTime(0.25, start + dur * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  });
}

function playStreak() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // 3 quick ascending tones
  const freqs = [600, 800, 1000];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.06;
    gain.gain.setValueAtTime(0.25, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.12);
  });
}

function playBingo() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Short fanfare: C5 → E5 → G5 → C6 with overlap
  const freqs = [523.25, 659.25, 783.99, 1046.5];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.12;
    gain.gain.setValueAtTime(0.3, start);
    gain.gain.setValueAtTime(0.3, start + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.5);
  });
}

function playSurprise() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Dramatic 3-note descending stinger: E4 → C4 → A3
  const freqs = [329.63, 261.63, 220.0];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.2;
    gain.gain.setValueAtTime(0.25, start);
    gain.gain.setValueAtTime(0.25, start + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

function playWheelLand() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Two-tone descending chime: G5 → C5
  const freqs = [783.99, 523.25];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const start = now + i * 0.12;
    gain.gain.setValueAtTime(0.3, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  });
}

/** Short click for wheel segment ticks — bypasses debounce for rapid playback */
export function playSpinTick() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  } catch {
    // Non-critical
  }
}

function playRankUp() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Triumphant ascending power chord: C4 → E4 → G4 → C5 (fast, punchy)
  const freqs = [261.63, 329.63, 392.0, 523.25];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    // Add slight detuned layer for thickness
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 1.005;

    const gain = ctx.createGain();
    const start = now + i * 0.08;
    gain.gain.setValueAtTime(0.18, start);
    gain.gain.setValueAtTime(0.18, start + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc2.start(start);
    osc.stop(start + 0.5);
    osc2.stop(start + 0.5);
  });
}

function playCellBreak() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Crunch noise: short burst of filtered noise + descending tone
  const bufferSize = Math.floor(ctx.sampleRate * 0.15);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // Crackling noise with sharp transients
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.8;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + 0.15);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.35, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);

  // Low thud
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.3, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

const players: Record<SoundName, () => void> = {
  whoosh: playWhoosh,
  tick: playTick,
  ding: playDing,
  buzzer: playBuzzer,
  win: playWin,
  streak: playStreak,
  bingo: playBingo,
  wheelLand: playWheelLand,
  surprise: playSurprise,
  rankUp: playRankUp,
  cellBreak: playCellBreak,
};

export function useAudio() {
  const lastPlayedRef = useRef<Record<string, number>>({});

  const playSound = useCallback((name: SoundName) => {
    try {
      // Debounce: ignore if same sound played within 100ms
      const now = Date.now();
      if (now - (lastPlayedRef.current[name] || 0) < 100) return;
      lastPlayedRef.current[name] = now;

      players[name]();
    } catch {
      // Sound effects are non-critical
    }
  }, []);

  return { playSound };
}
