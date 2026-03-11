/**
 * Verify and populate movie soundtrack Spotify IDs.
 *
 * Usage:
 *   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy npx tsx scripts/verify-movie-soundtracks.ts
 *
 * What it does:
 *   1. Reads curated-movies.json
 *   2. Verifies each existing Spotify ID via the Tracks API
 *   3. For invalid/missing IDs, searches Spotify for "<movie title> soundtrack" and picks the best match
 *   4. Fetches album art (soundtrack cover) for each track
 *   5. Writes the updated file back
 *
 * Flags:
 *   --dry-run   Print results without writing the file
 *   --verbose   Show detailed search/match info
 */

import * as fs from 'fs';
import * as path from 'path';

interface MovieEntry {
  id: string;
  mediaType: 'movie';
  title: string;
  director: string;
  genre: string;
  year: number;
  previewUrl: string | null;
  albumArt: string;
  soundtrackSearch?: string; // optional hint for Spotify search
}

const MOVIES_PATH = path.resolve(__dirname, '../src/data/curated-movies.json');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

async function getToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET env vars');
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`Spotify auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function verifyTrackIds(token: string, ids: string[]): Promise<Map<string, { valid: boolean; name?: string; artist?: string; previewUrl?: string | null; albumArt?: string }>> {
  const results = new Map<string, { valid: boolean; name?: string; artist?: string; previewUrl?: string | null; albumArt?: string }>();

  // Spotify API accepts max 50 IDs per request
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const res = await fetch(`https://api.spotify.com/v1/tracks?ids=${batch.join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error(`API error verifying tracks: ${res.status}`);
      for (const id of batch) results.set(id, { valid: false });
      continue;
    }

    const data = await res.json();
    for (let j = 0; j < batch.length; j++) {
      const track = data.tracks[j];
      if (track) {
        results.set(batch[j], {
          valid: true,
          name: track.name,
          artist: track.artists?.map((a: any) => a.name).join(', '),
          previewUrl: track.preview_url || null,
          albumArt: track.album?.images?.[0]?.url || '',
        });
      } else {
        results.set(batch[j], { valid: false });
      }
    }
  }

  return results;
}

async function searchSoundtrack(token: string, movie: MovieEntry): Promise<{ id: string; name: string; artist: string; previewUrl: string | null; albumArt: string } | null> {
  const queries = [
    movie.soundtrackSearch, // explicit hint takes priority
    `${movie.title} soundtrack`,
    `${movie.title} original motion picture`,
    `${movie.title} theme`,
    `${movie.title} main theme`,
  ].filter(Boolean) as string[];

  for (const query of queries) {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (VERBOSE) console.log(`  Search failed for "${query}": ${res.status}`);
      continue;
    }

    const data = await res.json();
    const tracks = data.tracks?.items || [];

    if (VERBOSE) {
      console.log(`  Search "${query}" → ${tracks.length} results`);
      for (const t of tracks.slice(0, 3)) {
        console.log(`    - "${t.name}" by ${t.artists?.map((a: any) => a.name).join(', ')}`);
      }
    }

    // Pick the first result that has a preview URL, or just the first result
    const withPreview = tracks.find((t: any) => t.preview_url);
    const best = withPreview || tracks[0];
    if (best) {
      return {
        id: best.id,
        name: best.name,
        artist: best.artists?.map((a: any) => a.name).join(', '),
        previewUrl: best.preview_url || null,
        albumArt: best.album?.images?.[0]?.url || '',
      };
    }
  }

  return null;
}

async function main() {
  console.log('🎬 Movie Soundtrack Verifier\n');

  const movies: MovieEntry[] = JSON.parse(fs.readFileSync(MOVIES_PATH, 'utf-8'));
  console.log(`Loaded ${movies.length} movies from curated-movies.json\n`);

  const token = await getToken();
  console.log('✓ Spotify authenticated\n');

  // Step 1: Verify existing IDs
  const existingIds = movies.map((m) => m.id).filter((id) => id && id.length > 0);
  console.log(`Verifying ${existingIds.length} existing Spotify IDs...`);
  const verification = await verifyTrackIds(token, existingIds);

  let validCount = 0;
  let invalidCount = 0;
  const needsSearch: MovieEntry[] = [];

  for (const movie of movies) {
    const result = verification.get(movie.id);
    if (result?.valid) {
      validCount++;
      if (VERBOSE) {
        console.log(`  ✓ ${movie.title} → "${result.name}" by ${result.artist}`);
      }
      // Update albumArt if we got one from the API
      if (result.albumArt && !movie.albumArt) {
        movie.albumArt = result.albumArt;
      }
      if (result.previewUrl && !movie.previewUrl) {
        movie.previewUrl = result.previewUrl;
      }
    } else {
      invalidCount++;
      console.log(`  ✗ ${movie.title} — ID "${movie.id}" is invalid`);
      needsSearch.push(movie);
    }
  }

  console.log(`\n${validCount} valid, ${invalidCount} invalid\n`);

  // Step 2: Search for replacements for invalid IDs
  if (needsSearch.length > 0) {
    console.log(`Searching Spotify for ${needsSearch.length} missing soundtracks...`);
    for (const movie of needsSearch) {
      console.log(`\n  Searching: ${movie.title} (${movie.year})...`);
      const result = await searchSoundtrack(token, movie);
      if (result) {
        console.log(`  → Found: "${result.name}" by ${result.artist} [${result.id}]`);
        movie.id = result.id;
        if (result.previewUrl) movie.previewUrl = result.previewUrl;
        if (result.albumArt) movie.albumArt = result.albumArt;
      } else {
        console.log(`  → No soundtrack found!`);
      }

      // Rate limit: small delay between searches
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Step 3: Write updated file
  // Strip the soundtrackSearch helper field before writing
  const output = movies.map(({ soundtrackSearch, ...rest }) => rest);

  if (DRY_RUN) {
    console.log('\n--dry-run: Not writing file. Results:');
    console.log(JSON.stringify(output, null, 2));
  } else {
    fs.writeFileSync(MOVIES_PATH, JSON.stringify(output, null, 2) + '\n');
    console.log(`\n✓ Updated ${MOVIES_PATH}`);
  }

  // Summary
  const withPreview = output.filter((m) => m.previewUrl).length;
  const withArt = output.filter((m) => m.albumArt).length;
  console.log(`\nSummary: ${output.length} movies, ${withPreview} with preview URLs, ${withArt} with album art`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
