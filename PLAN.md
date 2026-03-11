# Multi-Media Integration Plan

## Content Pipeline: Movie Clips

### The Hard Question: Where Do Movie Clips Come From?

Three realistic options:

**Option A: Movie Soundtrack Audio (via Spotify)** — Reuses the entire existing audio pipeline
- Source iconic movie theme songs/scores from Spotify (e.g., "Star Wars Main Theme", "My Heart Will Go On")
- Players hear the audio and guess which *movie* it's from, the year, director, etc.
- Pros: Zero new infrastructure. Same Howler.js player, same preview scraping, same 30s clips.
- Cons: Not really "movie clips" — it's still audio. Some movies have no iconic soundtrack on Spotify.

**Option B: YouTube Trailer Embeds (via TMDB API)**
- TMDB's `/movie/{id}/videos` endpoint returns YouTube trailer keys
- Embed a YouTube iframe player for ~30s of the trailer
- Pros: Actual movie content. TMDB API is free (rate limit: 40 req/s). Rich metadata (director, genre, cast, tagline).
- Cons: YouTube embeds are heavy, can't control exact clip timing well, autoplay restrictions on mobile, trailers reveal the movie title in many cases (defeats guessing).

**Option C: Audio Quotes / Dialogue Clips**
- Would need a curated dataset of famous movie quotes as audio files
- Hosted on our own storage or a CDN
- Pros: Perfect for guessing. Iconic lines are memorable.
- Cons: Massive curation effort, copyright concerns, need hosting.

### Recommendation: Option A for MVP, Option B as enhancement

Option A lets us ship movie rounds immediately with zero infrastructure changes. A curated JSON of movie soundtracks (Spotify track IDs mapped to movie metadata) is all we need. Option B can be added later for a richer experience.

---

## Architecture Changes

### Phase 1: Type Generalization (Foundation)

**`src/types/game.ts`** — Introduce `MediaItem` as a union/superset type:

```typescript
export type MediaType = 'music' | 'movie';

// Base fields shared by all media
interface MediaBase {
  id: string;
  mediaType: MediaType;
  year: number;
  previewUrl: string | null;  // audio URL (Spotify preview or soundtrack clip)
  imageUrl: string;           // album art or movie poster
}

// Music-specific
export interface MusicItem extends MediaBase {
  mediaType: 'music';
  name: string;       // song title
  artist: string;
  album: string;
}

// Movie-specific
export interface MovieItem extends MediaBase {
  mediaType: 'movie';
  title: string;      // movie title
  director: string;
  genre: string;      // primary genre
}

export type MediaItem = MusicItem | MovieItem;

// Keep Track as alias for backwards compat during migration
export type Track = MusicItem;
```

**Category system** — Per-media-type guess categories:

```typescript
// Music categories (existing)
export type MusicGuessCategory = 'year' | 'artist' | 'title' | 'year-approx' | 'album' | 'decade';

// Movie categories (new)
export type MovieGuessCategory = 'year' | 'director' | 'movie-title' | 'year-approx' | 'genre' | 'decade';

export type GuessCategory = MusicGuessCategory | MovieGuessCategory;

// Mapping: which categories apply to which media type
export const MEDIA_GUESS_CATEGORIES: Record<MediaType, GuessCategory[]> = {
  music: ['year', 'artist', 'title', 'year-approx', 'album', 'decade'],
  movie: ['year', 'director', 'movie-title', 'year-approx', 'genre', 'decade'],
};
```

**Wheel segments** — Dynamic based on active media types:

```typescript
// Each media type has its own wheel segment set
export const MUSIC_WHEEL_SEGMENTS: WheelSegment[] = [ /* existing 8 segments */ ];
export const MOVIE_WHEEL_SEGMENTS: WheelSegment[] = [
  { category: 'year', label: 'Year', color: '#4d9fff', baseColor: '...', accentColor: '...' },
  { category: 'director', label: 'Director', color: '#ff3355', baseColor: '...', accentColor: '...' },
  { category: 'movie-title', label: 'Movie', color: '#33ff77', baseColor: '...', accentColor: '...' },
  { category: 'year-approx', label: '±1 Year', color: '#bc4dff', baseColor: '...', accentColor: '...' },
  { category: 'genre', label: 'Genre', color: '#ff8833', baseColor: '...', accentColor: '...' },
  { category: 'everybody-drinks', label: 'Cheers!', color: '#ffcc00', baseColor: '...', accentColor: '...' },
  { category: 'decade', label: 'Decade', color: '#ff4da6', baseColor: '...', accentColor: '...' },
  { category: 'rock-off', label: 'Rock Off', color: '#00e6cc', baseColor: '...', accentColor: '...' },
];
// Mixed mode: alternate segments per round based on current media item
```

### Phase 2: Lobby Settings

**`LobbySettings`** — Add content mode:

```typescript
export interface LobbySettings {
  // ... existing fields ...
  contentMode: 'music' | 'movies' | 'mixed';
}
```

**HostLobby UI** — Add a "Content" segmented toggle (Music / Movies / Mixed) alongside existing Timer/Win Condition/Music Source toggles.

When "Movies" or "Mixed" selected, the Music Source toggle could expand to also show movie source options (curated movie list initially).

### Phase 3: Movie Data Layer

**`src/data/curated-movies.json`** — Curated movie soundtracks with movie metadata:

```json
[
  {
    "id": "3VqHuw0wFlIHZ8EXIoGMnV",
    "mediaType": "movie",
    "title": "Star Wars",
    "director": "George Lucas",
    "genre": "Sci-Fi",
    "year": 1977,
    "previewUrl": null,
    "imageUrl": "https://image.tmdb.org/t/p/w500/..."
  }
]
```

Each entry maps a Spotify track ID (the iconic soundtrack song) to movie metadata. The audio pipeline stays identical — we just play the soundtrack and ask about the movie.

**TMDB API integration** (optional enhancement) — For movie posters and metadata validation:
- `TMDB_API_KEY` env var
- `src/lib/tmdb/client.ts` — Fetch movie details, posters
- Used to populate `imageUrl` (movie poster) in curated data

### Phase 4: Engine & Matching Updates

**`src/lib/game/matching.ts`** — Add movie category matching:

```typescript
export function checkAnswer(category: GuessCategory, guess: string, media: MediaItem) {
  // year, year-approx, decade — identical logic (both have .year)

  if (media.mediaType === 'movie') {
    switch (category) {
      case 'director': // fuzzy match against media.director (same as artist logic)
      case 'movie-title': // fuzzy match against media.title
      case 'genre': // fuzzy match against media.genre
    }
  } else {
    switch (category) {
      case 'artist': // existing logic
      case 'title': // existing logic
      case 'album': // existing logic
    }
  }
}
```

**`src/lib/game/bingo.ts`** — Generate cards using categories appropriate to the content mode:
- Music mode: existing 6 music categories
- Movie mode: 6 movie categories
- Mixed mode: combine both sets, ensuring balance

**`src/lib/game/room.ts`** — Track pool management works identically (MediaItem has `id` and `previewUrl`).

### Phase 5: Server Handler Updates

**`server-handlers.ts`** — Minimal changes:
- `serializeRoom()`: Same anti-cheat pattern — hide `title`/`director`/`genre` (or `name`/`artist`/`album`) during PLAYING phase, expose only `id`, `previewUrl`, `imageUrl`
- `HOST_START_GAME`: Accept `{ tracks: MediaItem[] }` (or `{ mediaItems: MediaItem[] }` for clarity)
- Wheel spin: Select from appropriate segment set based on current item's `mediaType`
- Round results: Send full `MediaItem` to clients

### Phase 6: UI Component Updates

**Components that access Track fields directly:**

| Component | Current | Change |
|-----------|---------|--------|
| `RoundResults.tsx` | Shows `track.name`, `track.artist`, `track.album` | Conditional: music shows name/artist/album, movie shows title/director/genre |
| `HostBottomBar.tsx` | Shows `track.name — track.artist` | Conditional: movie shows `title — director` |
| `SongPlayer.tsx` | `previewUrl` + `albumArt` | Rename prop to `imageUrl`, same audio logic |
| `GuessInput.tsx` | Placeholder text per category | Add movie category placeholders ("Enter the director", "Enter the movie title") |
| `CategoryBadge.tsx` | Label from segment | Works automatically if segments have correct labels |

### Phase 7: Mixed Mode Logic

In mixed mode, the game alternates between music and movie items:
- Track pool contains both `MusicItem[]` and `MovieItem[]`
- `getNextTrack()` returns whichever is next (could alternate, could be random)
- Wheel segments change per round to match the current item's media type
- Bingo cards use categories from both types

---

## Migration Strategy

To avoid a massive breaking change:

1. **Add `mediaType` field to existing `Track` type** with default `'music'`
2. **Keep `Track` as an alias** — existing code keeps working
3. **Add movie types alongside** — no existing code breaks
4. **Gradually update components** to handle both types via conditional rendering
5. **Curated tracks JSON** — add `"mediaType": "music"` to existing entries (or default in code)

---

## Files to Create/Modify

### New Files
- `src/data/curated-movies.json` — Movie soundtrack dataset
- `src/lib/tmdb/client.ts` — TMDB API client (optional, for posters)

### Modified Files (ordered by dependency)
1. `src/types/game.ts` — MediaType, MediaItem union, movie categories, movie wheel segments
2. `src/lib/game/matching.ts` — Movie category matching logic
3. `src/lib/game/bingo.ts` — Media-type-aware card generation
4. `src/lib/game/wheel.ts` — Media-type-aware segment selection
5. `src/lib/game/room.ts` — Minimal (MediaItem instead of Track)
6. `src/lib/game/engine.ts` — Minimal (type updates)
7. `src/lib/socket/server-handlers.ts` — Serialize MediaItem, dynamic wheel
8. `src/stores/gameStore.ts` — `currentTrack` → `currentMedia` (or keep name, update type)
9. `src/hooks/useGameState.ts` — Type updates
10. `src/components/host/RoundResults.tsx` — Conditional music/movie display
11. `src/components/host/HostBottomBar.tsx` — Conditional display
12. `src/components/host/SongPlayer.tsx` — Rename albumArt prop
13. `src/components/host/HostLobby.tsx` — Content mode setting UI
14. `src/components/player/GuessInput.tsx` — Movie category inputs
15. `src/app/host/[roomCode]/HostPageContent.tsx` — Load movie tracks, content mode

---

## Implementation Order

**Step 1: Types & data model** (types/game.ts) — Foundation everything builds on
**Step 2: Curated movies JSON** — Need content to test with
**Step 3: Matching & bingo** — Core game logic for movie categories
**Step 4: Server handlers** — Serve movie content correctly
**Step 5: Lobby settings** — Let host pick content mode
**Step 6: UI components** — Display movie info, movie-specific inputs
**Step 7: Mixed mode** — Alternating media types per round
