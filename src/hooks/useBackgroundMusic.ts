'use client';

import { useEffect, useRef } from 'react';
import type { GamePhase } from '@/types/game';

type Mood = 'idle' | 'tension' | 'celebration';

function getMood(phase: GamePhase): Mood {
  switch (phase) {
    case 'LOBBY':
    case 'SPINNING':
      return 'idle';
    case 'PLAYING':
      return 'tension';
    case 'ROUND_RESULTS':
    case 'DRINKING_SEGMENT':
    case 'GAME_OVER':
      return 'celebration';
    default:
      return 'idle';
  }
}

interface MoodNodes {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  filter: BiquadFilterNode | null;
  masterGain: GainNode;
}

function createMood(ctx: AudioContext, mood: Mood, destination: AudioNode): MoodNodes {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(destination);

  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  let filter: BiquadFilterNode | null = null;

  if (mood === 'idle') {
    // Warm C major triad pad (triangle waves)
    const freqs = [130.81, 164.81, 196.0]; // C3, E3, G3
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0.08;
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      oscillators.push(osc);
      gains.push(g);
    }
  } else if (mood === 'tension') {
    // C minor triad (sawtooth, low-pass filtered)
    const freqs = [130.81, 155.56, 196.0]; // C3, Eb3, G3
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 1;
    filter.connect(masterGain);

    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      // Slight detuning for unease
      osc.detune.value = (Math.random() - 0.5) * 10;
      const g = ctx.createGain();
      g.gain.value = 0.04;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      oscillators.push(osc);
      gains.push(g);
    }
  } else {
    // Bright C major (triangle + sine, higher octave)
    const freqs = [261.63, 329.63, 392.0]; // C4, E4, G4
    const types: OscillatorType[] = ['triangle', 'sine', 'triangle'];
    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = types[i];
      osc.frequency.value = freqs[i];
      const g = ctx.createGain();
      g.gain.value = 0.06;
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      oscillators.push(osc);
      gains.push(g);
    }
  }

  return { oscillators, gains, filter, masterGain };
}

function fadeIn(ctx: AudioContext, masterGain: GainNode, targetVolume: number, duration: number = 1.5) {
  const now = ctx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(targetVolume, now + duration);
}

function fadeOut(ctx: AudioContext, nodes: MoodNodes, duration: number = 1.5) {
  const now = ctx.currentTime;
  nodes.masterGain.gain.cancelScheduledValues(now);
  nodes.masterGain.gain.setValueAtTime(nodes.masterGain.gain.value, now);
  nodes.masterGain.gain.linearRampToValueAtTime(0, now + duration);

  // Clean up after fade
  setTimeout(() => {
    for (const osc of nodes.oscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    try { nodes.masterGain.disconnect(); } catch { /* ok */ }
    if (nodes.filter) {
      try { nodes.filter.disconnect(); } catch { /* ok */ }
    }
  }, (duration + 0.2) * 1000);
}

export function useBackgroundMusic(
  phase: GamePhase,
  timerSeconds: number | null,
  timerDuration: number,
  muted: boolean,
  volume: number, // 0-100
) {
  const ctxRef = useRef<AudioContext | null>(null);
  const currentNodesRef = useRef<MoodNodes | null>(null);
  const currentMoodRef = useRef<Mood | null>(null);

  // Respect prefers-reduced-motion
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  // Compute effective volume: 30% of host volume slider
  const effectiveVolume = muted || reducedMotionRef.current ? 0 : (volume / 100) * 0.3;

  // Mood changes
  useEffect(() => {
    if (reducedMotionRef.current) return;

    const mood = getMood(phase);

    if (mood === currentMoodRef.current) {
      // Just update volume
      if (currentNodesRef.current && ctxRef.current) {
        fadeIn(ctxRef.current, currentNodesRef.current.masterGain, effectiveVolume, 0.3);
      }
      return;
    }

    // Create AudioContext on first use
    if (!ctxRef.current) {
      try {
        ctxRef.current = new AudioContext();
      } catch {
        return;
      }
    }

    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Fade out old mood
    if (currentNodesRef.current) {
      fadeOut(ctx, currentNodesRef.current, 1.5);
    }

    // Create and fade in new mood
    const newNodes = createMood(ctx, mood, ctx.destination);
    fadeIn(ctx, newNodes.masterGain, effectiveVolume, 1.5);

    currentNodesRef.current = newNodes;
    currentMoodRef.current = mood;
  }, [phase, effectiveVolume]);

  // Timer urgency: during PLAYING, last 33% adds filter sweep
  useEffect(() => {
    if (phase !== 'PLAYING' || !currentNodesRef.current?.filter || !ctxRef.current) return;
    if (timerSeconds === null || timerDuration <= 0) return;

    const progress = timerSeconds / timerDuration; // 1 = full, 0 = expired
    const filter = currentNodesRef.current.filter;
    const ctx = ctxRef.current;

    if (progress < 0.33) {
      // Last third: ramp up filter cutoff for urgency
      const urgency = 1 - (progress / 0.33); // 0→1 as timer runs out
      const targetFreq = 400 + urgency * 1200; // 400 → 1600
      filter.frequency.cancelScheduledValues(ctx.currentTime);
      filter.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.3);
    } else {
      filter.frequency.cancelScheduledValues(ctx.currentTime);
      filter.frequency.setTargetAtTime(400, ctx.currentTime, 0.3);
    }
  }, [phase, timerSeconds, timerDuration]);

  // Volume changes (mute/unmute)
  useEffect(() => {
    if (currentNodesRef.current && ctxRef.current) {
      const target = muted || reducedMotionRef.current ? 0 : effectiveVolume;
      fadeIn(ctxRef.current, currentNodesRef.current.masterGain, target, 0.3);
    }
  }, [muted, effectiveVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentNodesRef.current && ctxRef.current) {
        fadeOut(ctxRef.current, currentNodesRef.current, 0.1);
      }
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
        ctxRef.current = null;
      }
    };
  }, []);
}
