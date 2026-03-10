import type { SpotifyToken, SpotifyTrack, SpotifyPlaylistResponse } from './types';

let cachedToken: SpotifyToken | null = null;

export async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.access_token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials');
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`Spotify auth failed ${res.status}:`, errorBody);
    throw new Error(`Spotify auth failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    ...data,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 60s buffer
  };

  return cachedToken!.access_token;
}

export function extractPlaylistId(url: string): string | null {
  // Handles: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
  // Also: spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
  const patterns = [
    /playlist\/([a-zA-Z0-9]+)/,
    /playlist:([a-zA-Z0-9]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function fetchPlaylistTracks(playlistId: string, limit = 100): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken();
  const tracks: SpotifyTrack[] = [];
  let url: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=items(track(id,name,preview_url,artists(name),album(name,release_date,images))),next,total`;

  while (url && tracks.length < limit) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`Spotify API error ${res.status}:`, errorBody);
      throw new Error(`Spotify API error: ${res.status}`);
    }

    const data: SpotifyPlaylistResponse = await res.json();
    for (const item of data.items) {
      if (item.track) {
        tracks.push(item.track);
      }
    }
    url = data.next;
  }

  return tracks;
}
