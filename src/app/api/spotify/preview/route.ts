import { NextRequest, NextResponse } from 'next/server';
import { getSpotifyToken } from '@/lib/spotify/client';
import { scrapePreviewUrl } from '@/lib/spotify/preview';
import { getCachedPreview, batchCacheAndSave } from '@/lib/preview-cache';

// POST /api/spotify/preview — fetch preview URLs + album art for Spotify track IDs
// Strategy: Cache first, then Spotify API (reliable), scrape embed pages as fallback
export async function POST(request: NextRequest) {
  try {
    const { trackIds } = await request.json();

    if (!Array.isArray(trackIds) || trackIds.length === 0) {
      return NextResponse.json({ error: 'Missing trackIds array' }, { status: 400 });
    }

    const previews: Record<string, string | null> = {};
    const albumArts: Record<string, string> = {};

    // Step 0: Check cache first
    const uncachedIds: string[] = [];
    for (const id of trackIds) {
      const cached = getCachedPreview(id);
      if (cached) {
        if (cached.previewUrl) previews[id] = cached.previewUrl;
        if (cached.albumArt) albumArts[id] = cached.albumArt;
      } else {
        uncachedIds.push(id);
      }
    }

    // If all cached, return early
    if (uncachedIds.length === 0) {
      return NextResponse.json({ previews, albumArts });
    }

    // Step 1: Try Spotify API in batches of 50 (API limit)
    let token: string | null = null;
    try {
      token = await getSpotifyToken();
    } catch {
      console.warn('Could not get Spotify token, will use scraping only');
    }

    if (token) {
      for (let i = 0; i < uncachedIds.length; i += 50) {
        const batch = uncachedIds.slice(i, i + 50);
        try {
          const res = await fetch(
            `https://api.spotify.com/v1/tracks?ids=${batch.join(',')}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.ok) {
            const data = await res.json();
            for (const track of data.tracks) {
              if (!track) continue;
              if (track.preview_url) {
                previews[track.id] = track.preview_url;
              }
              if (track.album?.images?.[0]?.url) {
                albumArts[track.id] = track.album.images[0].url;
              }
            }
          }
        } catch (err) {
          console.error('Spotify API batch failed:', err);
        }
      }
    }

    // Step 2: Scrape embed pages for uncached tracks still missing preview URLs
    const needScraping = uncachedIds.filter((id: string) => !previews[id]);
    if (needScraping.length > 0) {
      // Scrape in batches of 5 to avoid rate limiting
      for (let i = 0; i < needScraping.length; i += 5) {
        const batch = needScraping.slice(i, i + 5);
        const results = await Promise.all(
          batch.map(async (id: string) => {
            const url = await scrapePreviewUrl(id);
            return [id, url] as const;
          })
        );
        for (const [id, url] of results) {
          if (url) previews[id] = url;
        }
      }
    }

    // Save newly fetched results to cache
    batchCacheAndSave(previews, albumArts);

    return NextResponse.json({ previews, albumArts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
