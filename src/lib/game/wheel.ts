import { WHEEL_SEGMENTS, getWheelSegments, type WheelSegment, type MediaType } from '@/types/game';

export function spinWheel(mediaType?: MediaType | 'mixed'): { segment: WheelSegment; index: number; mediaType?: MediaType | 'mixed' } {
  const segments = mediaType ? getWheelSegments(mediaType) : WHEEL_SEGMENTS;
  const index = Math.floor(Math.random() * segments.length);
  return { segment: segments[index], index, mediaType };
}

export function isGuessCategory(category: string): boolean {
  return [
    'year', 'artist', 'title', 'year-approx', 'album', 'decade',
    'director', 'movie-title', 'genre',
  ].includes(category);
}

export function isPartyCategory(category: string): boolean {
  return ['everybody-drinks', 'rock-off'].includes(category);
}
