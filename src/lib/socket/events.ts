export const SOCKET_EVENTS = {
  // Client → Server
  HOST_CREATE_ROOM: 'host:create-room',
  PLAYER_JOIN_ROOM: 'player:join-room',
  SPECTATOR_JOIN: 'spectator:join',
  HOST_START_GAME: 'host:start-game',
  HOST_SPIN_WHEEL: 'host:spin-wheel',
  PLAYER_SUBMIT_GUESS: 'player:submit-guess',
  HOST_NEXT_ROUND: 'host:next-round',
  HOST_UPDATE_SETTINGS: 'host:update-settings',
  HOST_WHEEL_DONE: 'host:wheel-done',
  PLAYER_BUZZ_IN: 'player:buzz-in',
  PLAYER_SPIN_WHEEL: 'player:spin-wheel',
  HOST_KICK_PLAYER: 'host:kick-player',
  HOST_PLAY_AGAIN: 'host:play-again',
  HOST_REJOIN_ROOM: 'host:rejoin-room',
  HOST_END_SESSION: 'host:end-session',
  REQUEST_SYNC: 'request:sync',
  BINGO_CELL_PICK: 'bingo:cell-pick',

  // Server → Client
  ROOM_CREATED: 'room:created',
  PLAYER_JOINED: 'player:joined',
  PLAYER_LEFT: 'player:left',
  GAME_STATE_SYNC: 'game:state-sync',
  GAME_WHEEL_RESULT: 'game:wheel-result',
  GAME_SPINNER_SELECTED: 'game:spinner-selected',
  PLAYER_KICKED: 'player:kicked',
  GAME_ROUND_START: 'game:round-start',
  GAME_TIMER_TICK: 'game:timer-tick',
  GUESS_RESULT: 'guess:result',
  ROUND_RESULTS: 'round:results',
  CARD_UPDATE: 'round:card-update',
  ROW_COMPLETED: 'round:row-completed',
  GAME_WINNER: 'game:winner',
  GAME_PHASE_CHANGE: 'game:phase-change',
  SETTINGS_UPDATED: 'settings:updated',
  BINGO_PICK_AVAILABLE: 'bingo:pick-available',
  ROOM_CLOSED: 'room:closed',

  // Party events
  PARTY_EVERYBODY_DRINKS: 'party:everybody-drinks',
  PARTY_ROCK_OFF: 'party:rock-off',
  PARTY_BUZZ_RESULT: 'party:buzz-result',
  ROCK_OFF_ASSIGN_DRINK: 'rockoff:assign-drink',

  // Milestone events
  MILESTONE_EARNED: 'milestone:earned',
  MILESTONE_USE_DRINKS: 'milestone:use-drinks',
  MILESTONE_USE_BLOCK: 'milestone:use-block',
  MILESTONE_USE_SWAP: 'milestone:use-swap',
  MILESTONE_USE_STEAL: 'milestone:use-steal',
  MILESTONE_USE_FREE_MARK: 'milestone:use-free-mark',
  MILESTONE_DRINKS_RECEIVED: 'milestone:drinks-received',
  MILESTONE_BLOCK_RECEIVED: 'milestone:block-received',
  MILESTONE_SWAP_RECEIVED: 'milestone:swap-received',
  MILESTONE_STEAL_RECEIVED: 'milestone:steal-received',
  MILESTONE_SHIELD_CONSUMED: 'milestone:shield-consumed',
  MILESTONE_DOUBLE_CONSUMED: 'milestone:double-consumed',

  // Surprise events
  SURPRISE_EVENT: 'surprise:event',

  // Errors
  ERROR: 'error',
} as const;
