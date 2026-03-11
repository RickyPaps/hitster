import * as cheerio from 'cheerio';
import type { Track } from '@/types/game';
import type { SpotifyTrack } from './types';

export async function scrapePreviewUrl(trackId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://open.spotify.com/embed/track/${trackId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Look for preview URL in scripts or data attributes
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const content = $(script).html() || '';
      // Look for preview URL pattern
      const match = content.match(/https:\/\/p\.scdn\.co\/mp3-preview\/[a-zA-Z0-9]+[^"'\s]*/);
      if (match) return match[0];
    }

    // Also check for audioPreview in the page data
    const pageData = html.match(/"audioPreview":\s*\{[^}]*"url":\s*"([^"]+)"/);
    if (pageData) return pageData[1];

    return null;
  } catch (err) {
    console.error(`Failed to scrape preview for ${trackId}:`, err);
    return null;
  }
}

export async function getPreviewUrl(track: SpotifyTrack): Promise<string | null> {
  // Strategy 1: Use API preview_url if available
  if (track.preview_url) {
    return track.preview_url;
  }

  // Strategy 2: Scrape from embed page
  const scraped = await scrapePreviewUrl(track.id);
  if (scraped) return scraped;

  // Strategy 3: No preview available
  return null;
}

export async function convertSpotifyTracks(spotifyTracks: SpotifyTrack[]): Promise<Track[]> {
  const tracks: Track[] = [];

  // Process in batches of 5 to avoid rate limiting
  for (let i = 0; i < spotifyTracks.length; i += 5) {
    const batch = spotifyTracks.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (st) => {
        const previewUrl = await getPreviewUrl(st);
        const releaseDate = st.album?.release_date || '';
        const year = parseInt(releaseDate.split('-')[0], 10);
        const albumArt = st.album?.images?.[0]?.url || '';

        return {
          id: st.id,
          mediaType: 'music' as const,
          name: st.name,
          artist: st.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
          album: st.album?.name || 'Unknown Album',
          year: isNaN(year) ? 2000 : year,
          previewUrl,
          albumArt,
        } satisfies Track;
      })
    );
    tracks.push(...results);
  }

  return tracks;
}
