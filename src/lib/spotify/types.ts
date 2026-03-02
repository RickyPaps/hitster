export interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expiresAt: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  preview_url: string | null;
  artists: { name: string }[];
  album: {
    name: string;
    release_date: string;
    images: { url: string; height: number; width: number }[];
  };
}

export interface SpotifyPlaylistResponse {
  items: {
    track: SpotifyTrack;
  }[];
  next: string | null;
  total: number;
}
