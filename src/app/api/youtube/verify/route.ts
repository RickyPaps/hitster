import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/youtube/verify
 * Body: { videoIds: string[] }
 * Returns: { valid: string[] }
 *
 * Checks YouTube video IDs via oEmbed to verify they're embeddable.
 * Returns only the IDs that are actually playable.
 */
export async function POST(req: NextRequest) {
  try {
    const { videoIds } = await req.json() as { videoIds: string[] };

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json({ valid: [] });
    }

    // Check in batches of 10 to avoid overwhelming YouTube
    const batchSize = 10;
    const valid: string[] = [];

    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (id) => {
          const res = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
            { method: 'HEAD' }
          );
          return { id, ok: res.ok };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.ok) {
          valid.push(result.value.id);
        }
      }

      // Small delay between batches
      if (i + batchSize < videoIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return NextResponse.json({ valid });
  } catch (e) {
    console.error('YouTube verify error:', e);
    return NextResponse.json({ valid: [] }, { status: 500 });
  }
}
