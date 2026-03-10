'use client';

import { useRef, useCallback } from 'react';
import { Howl } from 'howler';

const sfxCache = new Map<string, Howl>();

function getSfx(name: string): Howl {
  if (sfxCache.has(name)) return sfxCache.get(name)!;
  const howl = new Howl({
    src: [`/sounds/${name}.mp3`],
    volume: 0.5,
    preload: true,
  });
  sfxCache.set(name, howl);
  return howl;
}

export function useAudio() {
  const playSound = useCallback((name: 'ding' | 'buzzer' | 'tick' | 'win' | 'whoosh') => {
    try {
      getSfx(name).play();
    } catch {
      // Sound effects are non-critical
    }
  }, []);

  return { playSound };
}
