import { WHEEL_SEGMENTS, type WheelSegment } from '@/types/game';

export function spinWheel(): { segment: WheelSegment; index: number } {
  const index = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
  return { segment: WHEEL_SEGMENTS[index], index };
}

export function isGuessCategory(category: string): boolean {
  return ['year', 'artist', 'title', 'year-approx', 'album'].includes(category);
}

export function isPartyCategory(category: string): boolean {
  return ['everybody-drinks', 'hot-take', 'rock-off'].includes(category);
}
