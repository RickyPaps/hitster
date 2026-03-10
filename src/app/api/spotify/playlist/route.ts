import { NextRequest, NextResponse } from 'next/server';
import { extractPlaylistId, fetchPlaylistTracks } from '@/lib/spotify/client';
import { convertSpotifyTracks } from '@/lib/spotify/preview';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing playlist URL' }, { status: 400 });
  }

  const playlistId = extractPlaylistId(url);
  if (!playlistId) {
    return NextResponse.json({ error: 'Invalid playlist URL' }, { status: 400 });
  }

  try {
    const spotifyTracks = await fetchPlaylistTracks(playlistId);
    const tracks = await convertSpotifyTracks(spotifyTracks);

    // Filter to only tracks with preview URLs
    const playable = tracks.filter((t) => t.previewUrl);

    return NextResponse.json({
      total: tracks.length,
      playable: playable.length,
      tracks: playable,
    });
  } catch (error: any) {
    console.error('Playlist API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
