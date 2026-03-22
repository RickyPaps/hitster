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

A single HTTP server serves both Next.js pages and Socket.io WebSocket connections on port 3000. Deployed on **Render** (free tier) at `https://hitster-v8pa.onrender.com`. Vercel/Netlify cannot be used (no persistent WebSocket support). `tsx` is in `dependencies` (not devDependencies) so it's available at runtime on Render.

```
HTTP request → Next.js handler (pages, API routes)
WS connection → Socket.io → registerSocketHandlers() in src/lib/socket/server-handlers.ts
```

### Game State Machine

```
LOBBY → SPINNING → PLAYING → JUDGING (lyrics only) → ROUND_RESULTS → repeat
                 ↘ DRINKING_SEGMENT (party categories) → repeat     → GAME_OVER
```

All game logic lives server-side. The `GameEngine` (src/lib/game/engine.ts) operates directly on mutable `RoomState` objects stored in an in-memory `Map<string, RoomState>` (src/lib/game/room.ts). No persistence — server restart loses all games. Tracks are Fisher-Yates shuffled at game start (`shuffleTracks()` in room.ts) with preview-URL tracks first, then iterated sequentially — ensures even distribution and no perceived repetition.

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

**Host wheel** (`src/components/host/WheelSpinner.tsx`) — auto-spin with random velocity, no user interaction. Multi-stage landing impact sequence (vignette → shockwave → confetti → category reveal, see Animation System section).

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

### Milestone System

**Score-based milestones** (fire once per game, tracked via `PlayerMilestones` Earned/Used/Active booleans):
- 250 pts: **Shield** — immune to next drink penalty (auto-applied, consumed on next penalty)
- 500 pts: **Assign Drink** — pick a target player to drink
- 750 pts: **Bingo Swap** — steal a marked cell from target, gain one on own card
- 1000 pts: **Block Cell** — unmark a target's bingo cell
- 1500 pts: **Double Points** — next correct answer = 2x points (auto-applied)
- 2000 pts: **Steal** — steal 200 pts from any opponent

**Streak rewards** (server-tracked via `Player.streak`, reset on wrong answer):
- 3-streak: free cell mark on own card (player picks unmarked cell) — **repeatable** (fires every time streak hits 3)
- 5-streak: all other players +1 drink, streak resets to 0

Milestone thresholds checked in `handleTimerEnd` via `checkMilestoneThresholds()`. Shield blocks drink penalties via `applyDrinkPenalty()`. UI: `MilestoneReward` component (`src/components/player/MilestoneReward.tsx`) with `MILESTONE_CONFIG` record, step machine (announce → selectPlayer → selectCell → selectOwnCell). All milestones require manual dismiss (centered full-screen modal with dark backdrop blur, no auto-dismiss timer).

### Surprise Events

Per-room timer fires every 3–5 minutes (randomized). Only fires between rounds (`ROUND_RESULTS` or `SPINNING` phase). Timer starts on `HOST_START_GAME`, cleared on `GAME_OVER` / `PLAY_AGAIN` / room cleanup.

6 event types (`SurpriseEventType`): `spotlight` (target drinks), `doubleRound` (2x scores), `everybodyCheers` (all drink), `categoryCurse` (target loses a marked cell), `luckyStar` (target gets a free cell), `hotSeat` (target gets 2x drink penalties if wrong).

`SurpriseModifiers` on `RoomState`: `doublePoints` (boolean, cleared after round), `hotSeatPlayerId` (string | null, cleared after round). `SurpriseEventOverlay` (`src/components/host/SurpriseEventOverlay.tsx`) for host full-screen display; player gets banner notification in `PlayerPageContent`.

## Key Types (src/types/game.ts)

`Track`, `Player` (with `streak`, `milestones: PlayerMilestones`), `RoomState` (with `surpriseModifiers: SurpriseModifiers`), `LobbySettings`, `GamePhase`, `BingoCell`, `WheelSegment` (with `baseColor`/`accentColor`), `WHEEL_SEGMENTS` constant, `MilestoneType`, `SurpriseEventType`, `SurpriseModifiers`, `PlayerMilestones`.

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

**SVG Icons** (`SVGIcons.tsx`) — 16 inline React SVG components, each accepts `size` and `color` props:
- `ConfettiStar`, `ConfettiDiamond`, `MusicalNote`, `MusicalNotes` — confetti particle shapes
- `StreakFlame` — fire with inner/outer flame paths (streak counter)
- `SparkleIcon` — 4-ray sparkle burst (cell mark, bonus indicators)
- `TrophyIcon` — trophy cup with handles + base + star decoration (winner screen)
- `LightningBolt` — zigzag bolt (bonus points, Rock Off)
- `CrownIcon` — 3-point crown (leaderboard 1st place)
- `ArrowUp` / `ArrowDown` — rank change indicators
- `ShieldIcon` — shield (250 pts milestone)
- `SwapIcon` — swap arrows (750 pts milestone)
- `DoublePtsIcon` — 2x badge (1500 pts milestone)
- `StealIcon` — grab hand (2000 pts milestone)
- `SurpriseIcon` — surprise star (surprise events)

**Confetti** (`src/lib/confetti.ts`) — imperative confetti via `canvas-confetti` library. 6 preset functions, all check `prefers-reduced-motion` and no-op if true:
- `fireConfetti(opts?)` — standard neon burst (25 particles)
- `fireSideCannons(count)` — left+right angled cannons (winner/celebration)
- `fireFireworks(bursts)` — timed bursts at random positions
- `fireGoldConfetti(opts?)` — gold/amber palette (drinking segments)
- `fireStars(origin?)` — star-shaped particles (bingo)
- `fireFromElement(el, opts?)` — confetti from a DOM element's bounding rect

**Core Components:**
- `TextReveal` — two-mode text animation: `typewriter` (char-by-char at configurable speed with blinking cursor) and `shimmer` (metallic rainbow gradient sweep via `background-clip: text`). Respects `prefers-reduced-motion`.
- `AnimatedNumber` — smooth number tweening using Framer Motion `animate()`. Keeps previous value in ref, tweens to new value over 0.6s with easeOut.
- `FloatingScore` — "+100" text that floats upward and fades. Shows `LightningBolt` when points > 100.
- `ScreenShake` — wrapper that shakes children on trigger (`light`/`medium`/`heavy` intensity via x-axis keyframes).
- `StreakCounter` — flame SVG + count, shown when streak >= 2. Pulse intensity scales with streak. "Broken" animation on reset.
- `BingoLineCelebration` — full-screen overlay with gradient banner ("BINGO LINE!" / "DOUBLE LINE!"), confetti via `fireStars()`, auto-dismisses after 2s.
- `SurpriseEventOverlay` (`src/components/host/SurpriseEventOverlay.tsx`) — full-screen host overlay with `EVENT_CONFIG` record, spring animation, confetti via `fireConfetti()` for positive events, auto-dismiss.

**Store fields** (`gameStore.ts`): `streak` (consecutive correct answers), `prevCompletedRows` (for detecting new bingo line completions), with `incrementStreak()`, `resetStreak()`, `setPrevCompletedRows()` actions.

**Player view integrations:**
- `RoundFeedback` — `fireConfetti()` on correct, floating score, screen shake on wrong, SVG draw-on checkmark (pathLength animation), sparkle on bonus categories
- `BingoCard` — sparkle overlay on newly marked cells, bingo line flash cascade (CSS `.bingo-line-flash`), `fireStars()` on line completion, near-bingo pulse glow on unmarked cells one away from completing a line
- `GuessInput` — enhanced button press (`scale: 0.92, rotate: -1`), pulsing boxShadow glow when input non-empty
- `PlayerPageContent` — streak tracking in GUESS_RESULT handler, StreakCounter in header, BingoLineCelebration overlay on line completion, enhanced GAME_OVER with TrophyIcon + `fireSideCannons()` + sequenced reveal

**Host view integrations:**
- `WinnerScreen` — TrophyIcon SVG, `fireSideCannons(40)` on mount, SparkleIcon sparkles, `AnimatedNumber` for podium scores, sequenced reveal (trophy → name → stats → button)
- `Leaderboard` — CrownIcon on 1st place with subtle bob animation, `AnimatedNumber` for score tweening, ArrowUp/ArrowDown on rank changes (auto-fade after 3s)
- `DrinkingPrompt` — `fireGoldConfetti()` on "Everybody Drinks", LightningBolt SVGs flanking "ROCK OFF!" with electric flicker opacity animation
- `HostLobby` — player join celebration: `AnimatePresence` + `layout` prop for smooth card shifting, new players get spring entrance (`x: -30, scale: 0.8 → 1`) + fuchsia glow burst ring

**Wheel landing impact** (`WheelSpinner.tsx`) — multi-stage `landingStage` state machine (`idle → decel → impact → reveal`):
- **decel**: radial gradient vignette darkening wheel edges (last 15% of spin)
- **impact**: expanding shockwave ring (scale 0.3→2.5) in landed segment color + `playSound('wheelLand')` + `fireFromElement()` confetti
- **reveal**: CategoryBadge enters with spring animation (400ms after impact)
- Total sequence ~2s; `onSpinComplete()` called at 2s

**Results reveal** (`RoundResults.tsx`) — 6-stage cinematic sequence (`flash → spotlight → albumArt → trackInfo → playerCards → done`):
- **spotlight** (400ms): trapezoid beam via `clipPath: polygon()`, purple gradient, `scaleY: 0→1`
- **albumArt** (800ms): 3D flip via `rotateY: -90→0` with `perspective: 800px`
- **trackInfo** (1400ms): `<TextReveal mode="typewriter" speed={30}>` for track name, staggered artist/album slide-up
- **playerCards** (2200ms): cascade one-by-one (300ms apart), each fires `playSound('ding')` or `playSound('buzzer')`, correct answers also fire `fireConfetti({ particleCount: 8 })`
- **done**: "Next Round" button fades in

**Synthesized sounds** (`useAudio.ts`): `streak` (3 ascending tones: 600/800/1000 Hz, 50ms each), `bingo` (fanfare arpeggio: C5→E5→G5→C6, triangle wave, 120ms spacing with overlap), `reveal` (whoosh + shimmer chord)

**CSS utilities** (`globals.css`):
- `.streak-glow` — orange/red drop-shadow filter for flame icon
- `.bingo-line-flash` — keyframe animation pulsing inset box-shadow 3 times (fuchsia glow)
- `.surprise-flash` — flash animation for surprise event overlay
- `.hot-seat-glow` — pulsing red glow for hot seat target
- `.shield-shimmer` — shimmer animation for shield active indicator

### Synthesized Audio (src/hooks/useAudio.ts)

All sounds are Web Audio API synthesized (no audio files). `SoundName` type: `'ding' | 'buzzer' | 'tick' | 'win' | 'whoosh' | 'streak' | 'bingo' | 'surprise' | 'wheelLand' | 'reveal'`. The `useAudio()` hook returns `{ playSound }` with 100ms debounce per sound name. Separate `playSpinTick()` function for wheel tick sounds (bypasses debounce).

### Background Music (src/hooks/useBackgroundMusic.ts)

Phase-reactive ambient drone using Web Audio API (separate `AudioContext` from `useAudio.ts`). Three moods mapped to game phases:
- **idle** (LOBBY, SPINNING): warm C major triad pad (triangle waves, very quiet)
- **tension** (PLAYING): C minor triad (sawtooth, low-pass filtered, slight detuning)
- **celebration** (ROUND_RESULTS, DRINKING_SEGMENT, GAME_OVER): bright C major (triangle + sine, higher octave)

Crossfades between moods over 1.5s via `linearRampToValueAtTime`. During PLAYING phase, last 33% of timer ramps lowpass filter cutoff (400→1600 Hz) for urgency. Master volume = 30% of host volume slider. Respects mute toggle and `prefers-reduced-motion`.

Integrated in `HostPageContent.tsx` via `useBackgroundMusic(phase, timerSeconds, settings.timerDuration, muted, volume)`. No additional UI — existing mute/volume controls provide the parameters.

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
- Confetti uses `canvas-confetti` library (imperative calls), not React components — all old `ConfettiBurst` usage replaced
- Confetti/particle counts are capped (8-30 per-round, 80 max game-over) for performance
- Streak tracking spans across rounds via Zustand store (not local state)
- Bingo line detection compares current completed lines against `prevCompletedRows` in store
- Streak rewards (3/5) are repeatable and event-driven — server emits them on the fly each time the threshold is hit; score milestones use Earned/Used/Active booleans in `PlayerMilestones` and fire once per game
- Surprise event listeners live in Host/PlayerPageContent (local state + sound), NOT in `useGameState` hook
- `GAME_STATE_SYNC` handler must always sync nullable fields (winner, currentTrack) unconditionally — using `state.winner ?? null`, not `if (state.winner)` guards — otherwise values persist across PLAY_AGAIN cycles
- `trackHistory` (host local state) resets when phase returns to LOBBY
- Bingo cards are re-sent via individual `CARD_UPDATE` events (to each player's socket) on `HOST_START_GAME` and `HOST_PLAY_AGAIN` — this bypasses `GAME_STATE_SYNC` playerId lookup timing issues
- TrailerPlayer uses `max-w-5xl` (1024px) to fill large host screens; parent containers in HostGameShell use `max-w-4xl` (896px) for both PLAYING and DRINKING_SEGMENT phases

### QR Code Join

`HostLobby` displays a QR code next to the room code badge. Uses `qrcode.react` (QRCodeSVG) with teal neon styling. Click to expand. URL constructed via `window.location.origin + /play/ + roomCode`.

### Skip Reveal Button

`RoundResults` shows a "Skip" button during the cinematic reveal sequence (after spotlight stage). `skipReveal()` clears cascade interval, sets all players revealed, jumps to `done` stage.

### Player Sound Mute

`useAudio` hook now exposes `muted`, `setMuted`, `toggleMute` via a global `globalMuted` boolean + listener pattern. Player header shows a mute toggle button.

### Rock-Off Urgency

When players haven't buzzed in during rock-off, the GuessInput is wrapped in a `.rock-off-urgency` container with a pulsing teal neon border CSS animation.

### Game State Persistence

`src/lib/game/persistence.ts` — snapshots all in-progress rooms to `.game-snapshots/rooms.json` every 30s (from `server.ts` interval). On module load, `room.ts` calls `restoreRooms()` to recover. Only rooms with `phase !== 'LOBBY'` are snapshot. All players marked `connected: false` on restore (they reconnect via socket). Stale snapshots (>1hr) are discarded.

### Preview URL Cache

`src/lib/preview-cache.ts` — caches Spotify preview URLs and album art to `.game-snapshots/preview-cache.json`. Entries expire after 7 days. The `/api/spotify/preview` route checks cache first, only fetches uncached track IDs, then saves results back.

### Canvas-Based Particles

`DrinkSplash`, `FlameParticles`, `CellDisintegrate` all use `<canvas>` elements with `requestAnimationFrame` loops instead of individual DOM elements. DPI-aware rendering, additive glow via `globalCompositeOperation: 'lighter'`. Much better mobile performance.

### Spectator Mode

Players can join a room as spectator via `SPECTATOR_JOIN` socket event. Spectators join the Socket.io room to receive `GAME_STATE_SYNC` broadcasts but are NOT added to `room.players`. The player page shows a "Watch as Spectator" option on the join screen, displaying a read-only view with phase, timer, and leaderboard.
