import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/tmdb/trailers
 * Body: { movies: Array<{ title: string; year: number }> }
 * Returns: { trailers: Record<string, string> }  (key = "title|year", value = YouTube video ID)
 *
 * Uses TMDB API to search for movies and retrieve their YouTube trailer IDs.
 * Falls back gracefully if TMDB_API_KEY is not set.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { trailers: {}, error: 'TMDB_API_KEY not configured' },
      { status: 200 }
    );
  }

  try {
    const { movies } = await req.json() as {
      movies: Array<{ title: string; year: number }>;
    };

    if (!movies || !Array.isArray(movies)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const trailers: Record<string, string> = {};

    // Process in batches of 5 to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (movie) => {
          const key = `${movie.title}|${movie.year}`;

          // 1. Search TMDB for the movie
          const searchUrl = `https://api.themoviedb.org/3/search/movie?` +
            new URLSearchParams({
              api_key: apiKey,
              query: movie.title,
              year: String(movie.year),
            }).toString();

          const searchRes = await fetch(searchUrl);
          if (!searchRes.ok) return;

          const searchData = await searchRes.json();
          const tmdbMovie = searchData.results?.[0];
          if (!tmdbMovie) return;

          // 2. Get videos for the movie
          const videosUrl = `https://api.themoviedb.org/3/movie/${tmdbMovie.id}/videos?api_key=${apiKey}`;
          const videosRes = await fetch(videosUrl);
          if (!videosRes.ok) return;

          const videosData = await videosRes.json();
          const videos = videosData.results as Array<{
            site: string;
            type: string;
            key: string;
            official: boolean;
          }>;

          // Prefer official YouTube trailers, then teasers, then any YouTube video
          const trailer =
            videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
            videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
            videos.find((v) => v.site === 'YouTube' && v.type === 'Teaser') ||
            videos.find((v) => v.site === 'YouTube');

          if (trailer) {
            trailers[key] = trailer.key;
          }
        })
      );

      // Log any failures for debugging
      results.forEach((r, idx) => {
        if (r.status === 'rejected') {
          console.warn(`TMDB lookup failed for "${batch[idx]?.title}":`, r.reason);
        }
      });

      // Small delay between batches to respect rate limits
      if (i + batchSize < movies.length) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    return NextResponse.json({ trailers });
  } catch (e) {
    console.error('TMDB trailers endpoint error:', e);
    return NextResponse.json({ trailers: {}, error: 'Internal error' }, { status: 500 });
  }
}
