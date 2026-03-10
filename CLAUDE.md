# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev server (Next.js + Socket.io on port 3000)
npx tsx server.ts

# Production build
npx next build

# Production server
NODE_ENV=production npx tsx server.ts
```

No test runner or linter is configured. TypeScript strict mode is the primary safety net.

**Note on this machine**: PATH needs `/c/nvm-symlink` prepended.

## Architecture

### Custom Server (server.ts)

A single HTTP server serves both Next.js pages and Socket.io WebSocket connections on port 3000. This is why Vercel cannot be used for deployment (no persistent WebSocket support).

```
HTTP request → Next.js handler (pages, API routes)
WS connection → Socket.io → registerSocketHandlers() in src/lib/socket/server-handlers.ts
```

### Game State Machine

```
LOBBY → SPINNING → PLAYING → JUDGING (lyrics only) → ROUND_RESULTS → repeat
                 ↘ DRINKING_SEGMENT (party categories) → repeat     → GAME_OVER
```

All game logic lives server-side. The `GameEngine` (src/lib/game/engine.ts) operates directly on mutable `RoomState` objects stored in an in-memory `Map<string, RoomState>` (src/lib/game/room.ts). No persistence — server restart loses all games.

### Socket.io Event Flow

Server handlers are in `src/lib/socket/server-handlers.ts`. Each socket connection maintains a `currentRoom` closure variable. Key pattern: `serializeRoom()` **hides track details** (name/artist/album) during PLAYING phase to prevent cheating — only `previewUrl` and `albumArt` are sent to clients.

Events are defined in `src/lib/socket/events.ts`. The client singleton socket (`src/lib/socket/client.ts`) connects to the same host that served the page (no hardcoded URL), enabling both localhost dev and LAN phone play.

### Client State

Zustand store (`src/stores/gameStore.ts`) is synced via `GAME_STATE_SYNC` socket event on every server update. The `useGameState` hook (`src/hooks/useGameState.ts`) registers all socket listeners and updates the store.

### Audio Pipeline

1. Tracks load from curated JSON or Spotify playlist
2. At game start, tracks without `previewUrl` are sent to `/api/spotify/preview` (POST)
3. That endpoint scrapes `open.spotify.com/embed/track/{id}` via cheerio for MP3 preview URLs
4. Scraping happens in batches of 5 to avoid rate limiting
5. `SongPlayer` component uses Howler.js with `dynamic(() => import(...), { ssr: false })` because Howler accesses `window` at module load

### Wheel

Custom canvas-based wheel spinner. The `react-custom-roulette` library is incompatible with React 19. Animation is client-driven — host emits `HOST_WHEEL_DONE` when animation completes, then server transitions phase.

**Wheel rendering** is in `src/lib/wheel/draw-wheel.ts` (shared by host + player). Uses neon disco visuals: radial gradient segments (`baseColor` → `accentColor`), glowing white dividers, double neon purple outer rim, vinyl-record center hub, pink-to-purple gradient pointer with glow.

**Wheel animation** is in `src/lib/wheel/animate-spin.ts`. Two functions:
- `calculateSpinAnimation()` — from-zero spin for host auto-spin (velocity → spins + duration)
- `calculateSpinFromMomentum()` — mid-motion spin for player drag interaction (current rotation/velocity → target rotation + duration)

**Host wheel** (`src/components/host/WheelSpinner.tsx`) — auto-spin with random velocity, no user interaction.

**Player wheel** (`src/components/player/PlayerWheelSpinner.tsx`) — drag-to-spin interaction with state machine:
```
IDLE → DRAGGING → MOMENTUM → SERVER_SPIN → COMPLETE
```
- DRAGGING: finger/mouse angle tracked via `atan2`, wheel follows in real-time
- MOMENTUM: friction decay (`0.995/frame`), fires `onSwipe` to server
- SERVER_SPIN: server result arrives, `calculateSpinFromMomentum()` animates from current state to target segment
- Mouse drag supported for desktop testing (window-level `mousemove`/`mouseup`)

**Segment colors** in `WheelSegment` type have three fields: `color` (= accent, used by `CategoryBadge`), `baseColor` (dark), `accentColor` (neon). Defined in `WHEEL_SEGMENTS` in `src/types/game.ts`.

### Answer Matching (src/lib/game/matching.ts)

- **year**: ±2 tolerance
- **artist/title/album**: `string-similarity` with 0.4 threshold
- **lyrics**: Host manually approves/denies (JUDGING phase)

### Bingo Cards (src/lib/game/bingo.ts)

3x3 grid, 5 guess categories (year/artist/title/lyrics/album). At least 1 of each, max 3 of any. Win conditions: 1 row, 2 rows, or full card. Lines = 3 rows + 3 columns + 2 diagonals.

## Key Types (src/types/game.ts)

`Track`, `Player`, `RoomState`, `LobbySettings`, `GamePhase`, `BingoCell`, `WheelSegment` (with `baseColor`/`accentColor`), `WHEEL_SEGMENTS` constant.

## Env Vars (.env.local)

- `SPOTIFY_CLIENT_ID` — Spotify app credentials
- `SPOTIFY_CLIENT_SECRET` — Spotify app credentials

`NEXT_PUBLIC_SOCKET_URL` is not needed — Socket.io auto-detects the host.

### Home Page Disco Theme

The landing page (`src/app/page.tsx`) uses a full disco/nightclub aesthetic powered by GSAP (not framer-motion, though framer-motion remains in the project for other pages).

- **DiscoBackground** (`src/components/home/DiscoBackground.tsx`) — fixed layer behind content with:
  - 3D perspective dance floor (CSS grid with `rotateX(65deg)`) — 12x8 tiles desktop, 8x6 mobile
  - GSAP-animated tile color cycling through neon palette
  - 4 sweeping spotlights with `mix-blend-mode: screen`
  - CSS disco ball with rotating conic highlight and orbiting reflections
  - Canvas sparkle particles (60 desktop / 30 mobile) driven by `gsap.ticker`
  - All animations scoped via `gsap.context()` and cleaned up on unmount
  - `prefers-reduced-motion` respected — static render only

- **Monoton font** — imported in `layout.tsx` via `next/font/google`, exposed as `--font-display` CSS var

- **CSS utilities** in `globals.css`:
  - `--neon-pink`, `--neon-cyan`, `--neon-purple` color vars
  - `.chrome-text` — metallic gradient with `background-clip: text` + purple drop-shadow
  - `.neon-input` — focus state with cyan glow

- **Page animations** — GSAP entrance timeline (title scales in → subtitle fades → buttons stagger up). Mode-switch (menu ↔ join) re-animates the relevant section via a `mode`-dependent effect.

### Host Lobby Disco Theme

The host lobby (`src/components/host/HostLobby.tsx`) matches the home page's disco aesthetic, designed from a Google Stitch mockup.

- **Background** — CSS dance floor grid (`.dance-floor-grid`) with perspective transform + two fuchsia/teal spotlight beams via `mix-blend-screen` gradients
- **Header** — "HITSTER" title in Monoton font with `.neon-text-fuchsia` glow, teal-bordered lobby code badge (`.neon-box-teal`) showing room code with dash separators
- **Two-column layout** — Players panel (left) + Game Settings panel (right) in glassmorphic cards (`bg-purple-950/40 backdrop-blur-md`)
- **Player cards** — Colored avatar circles with initials (8-color rotation via `AVATAR_COLORS`), `(Host)` badge on first player, green checkmark / spinning sync icon for connection status, dashed placeholder for empty slots
- **Settings** — Segmented toggle buttons for Timer/Win Condition/Music Source with neon-fuchsia active state; drink options as custom `.disco-toggle` switches (CSS-only, no JS animation library)
- **Bottom bar** — "Leave Lobby" (rose neon outline, `.neon-box-rose`) + "Start Game" (fuchsia neon, `.animate-pulse-glow` pulsing, Monoton font)

- **CSS utilities** added to `globals.css`:
  - `.neon-box-fuchsia`, `.neon-box-teal`, `.neon-box-rose` — neon glow box-shadows with colored borders
  - `.neon-text-fuchsia`, `.neon-text-teal` — neon text glow effects
  - `.dance-floor-grid` — perspective grid background pattern
  - `.animate-pulse-glow` — subtle pulsing scale animation
  - `.disco-toggle` / `.disco-toggle.active` — custom toggle switch with fuchsia neon glow

### Animation System (src/components/animations/)

Duolingo-style micro-interactions and celebration animations using Framer Motion + custom inline SVGs. All animations use GPU-only properties (`transform`, `opacity`).

**SVG Icons** (`SVGIcons.tsx`) — 11 inline React SVG components, each accepts `size` and `color` props:
- `ConfettiStar`, `ConfettiDiamond`, `MusicalNote`, `MusicalNotes` — confetti particle shapes
- `StreakFlame` — fire with inner/outer flame paths (streak counter)
- `SparkleIcon` — 4-ray sparkle burst (cell mark, bonus indicators)
- `TrophyIcon` — trophy cup with handles + base + star decoration (winner screen)
- `LightningBolt` — zigzag bolt (bonus points, Rock Off)
- `CrownIcon` — 3-point crown (leaderboard 1st place)
- `ArrowUp` / `ArrowDown` — rank change indicators

**Core Components:**
- `ConfettiBurst` — reusable particle explosion (`active`, `particleCount`, `colors`, `duration`, `spread` props). Random shapes from SVG library + circles. Self-removes after animation.
- `FloatingScore` — "+100" text that floats upward and fades. Shows `LightningBolt` when points > 100.
- `ScreenShake` — wrapper that shakes children on trigger (`light`/`medium`/`heavy` intensity via x-axis keyframes).
- `StreakCounter` — flame SVG + count, shown when streak >= 2. Pulse intensity scales with streak. "Broken" animation on reset.
- `BingoLineCelebration` — full-screen overlay with gradient banner ("BINGO LINE!" / "DOUBLE LINE!"), confetti, auto-dismisses after 2s.

**Store fields** (`gameStore.ts`): `streak` (consecutive correct answers), `prevCompletedRows` (for detecting new bingo line completions), with `incrementStreak()`, `resetStreak()`, `setPrevCompletedRows()` actions.

**Player view integrations:**
- `RoundFeedback` — confetti burst on correct, floating score, screen shake on wrong, SVG draw-on checkmark (pathLength animation), sparkle on bonus categories
- `BingoCard` — sparkle overlay on newly marked cells, bingo line flash cascade (CSS `.bingo-line-flash`), mini confetti on line completion, near-bingo pulse glow on unmarked cells one away from completing a line
- `GuessInput` — enhanced button press (`scale: 0.92, rotate: -1`), pulsing boxShadow glow when input non-empty
- `PlayerPageContent` — streak tracking in GUESS_RESULT handler, StreakCounter in header, BingoLineCelebration overlay on line completion, enhanced GAME_OVER with TrophyIcon + confetti + sequenced reveal

**Host view integrations:**
- `WinnerScreen` — TrophyIcon SVG replaces emoji, dual ConfettiBursts (left + right, 40 particles each), SparkleIcon sparkles around name, sequenced reveal (trophy → name → stats → button with staggered delays)
- `Leaderboard` — CrownIcon on 1st place with subtle bob animation, score flash (scale pulse) on score increase, ArrowUp/ArrowDown on rank changes (auto-fade after 3s)
- `DrinkingPrompt` — gold confetti on "Everybody Drinks", LightningBolt SVGs flanking "ROCK OFF!" with electric flicker opacity animation

**Synthesized sounds** (`useAudio.ts`): `streak` (3 ascending tones: 600/800/1000 Hz, 50ms each), `bingo` (fanfare arpeggio: C5→E5→G5→C6, triangle wave, 120ms spacing with overlap)

**CSS utilities** (`globals.css`):
- `.confetti-container` — absolute positioned, pointer-events none, overflow hidden, z-50
- `.streak-glow` — orange/red drop-shadow filter for flame icon
- `.bingo-line-flash` — keyframe animation pulsing inset box-shadow 3 times (fuchsia glow)

### Synthesized Audio (src/hooks/useAudio.ts)

All sounds are Web Audio API synthesized (no audio files). `SoundName` type: `'ding' | 'buzzer' | 'tick' | 'win' | 'whoosh' | 'streak' | 'bingo'`. The `useAudio()` hook returns `{ playSound }` with 100ms debounce per sound name.

## Important Patterns

- All pages using socket/audio/browser APIs must be `'use client'`
- Howler.js components must use `dynamic()` with `ssr: false`
- Room codes are 4 chars (A-Z, 2-9, no ambiguous characters like O/0/I/1)
- Curated tracks (`src/data/curated-tracks.json`) have real Spotify IDs but `previewUrl: null` — URLs are scraped at runtime
- Party wheel categories (everybody-drinks, hot-take, rock-off) don't award bingo points
- Player reconnection works by matching `playerName` on the existing player list
- Home page uses GSAP for animations; other pages use framer-motion — both coexist
- GSAP animations on conditionally-rendered elements must NOT use inline `opacity: 0` — use `gsap.fromTo()` in an effect keyed on the condition instead
- Animation components use `position: absolute; pointer-events: none` to avoid blocking gameplay
- Confetti/particle counts are capped (15-25 per-round, 80 max game-over) for performance
- Streak tracking spans across rounds via Zustand store (not local state)
- Bingo line detection compares current completed lines against `prevCompletedRows` in store
