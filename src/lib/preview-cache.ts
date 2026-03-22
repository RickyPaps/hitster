/**
 * Simple preview URL cache.
 * Caches Spotify preview URLs and album art URLs to disk so they survive server restarts
 * and avoid repeated scraping of the same tracks.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const CACHE_DIR = join(process.cwd(), '.game-snapshots');
const CACHE_FILE = join(CACHE_DIR, 'preview-cache.json');

interface CacheEntry {
  previewUrl: string | null;
  albumArt: string | null;
  cachedAt: number;
}

let cache: Record<string, CacheEntry> = {};
let loaded = false;

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  try {
    if (!existsSync(CACHE_FILE)) return;
    const raw = readFileSync(CACHE_FILE, 'utf-8');
    const data = JSON.parse(raw);
    // Discard entries older than 7 days (preview URLs can expire)
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (const [id, entry] of Object.entries(data) as [string, CacheEntry][]) {
      if (now - entry.cachedAt < sevenDays) {
        cache[id] = entry;
      }
    }
  } catch {
    cache = {};
  }
}

function saveToDisk(): void {
  try {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
    writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf-8');
  } catch {
    // Non-critical
  }
}

/**
 * Get cached preview URL for a track ID.
 */
export function getCachedPreview(trackId: string): { previewUrl: string | null; albumArt: string | null } | null {
  ensureLoaded();
  const entry = cache[trackId];
  if (!entry) return null;
  // Only return if we have at least one useful value
  if (entry.previewUrl || entry.albumArt) {
    return { previewUrl: entry.previewUrl, albumArt: entry.albumArt };
  }
  return null;
}

/**
 * Cache preview URL + album art for a track ID.
 */
export function setCachedPreview(trackId: string, previewUrl: string | null, albumArt: string | null): void {
  ensureLoaded();
  cache[trackId] = { previewUrl, albumArt, cachedAt: Date.now() };
}

/**
 * Batch cache multiple entries and save to disk.
 */
export function batchCacheAndSave(
  previews: Record<string, string | null>,
  albumArts: Record<string, string | null>
): void {
  ensureLoaded();
  const allIds = new Set([...Object.keys(previews), ...Object.keys(albumArts)]);
  for (const id of allIds) {
    const existing = cache[id];
    cache[id] = {
      previewUrl: previews[id] ?? existing?.previewUrl ?? null,
      albumArt: albumArts[id] ?? existing?.albumArt ?? null,
      cachedAt: Date.now(),
    };
  }
  saveToDisk();
}
