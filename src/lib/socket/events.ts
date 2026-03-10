export const SOCKET_EVENTS = {
  // Client → Server
  HOST_CREATE_ROOM: 'host:create-room',
  PLAYER_JOIN_ROOM: 'player:join-room',
  HOST_START_GAME: 'host:start-game',
  HOST_SPIN_WHEEL: 'host:spin-wheel',
  PLAYER_SUBMIT_GUESS: 'player:submit-guess',
  HOST_NEXT_ROUND: 'host:next-round',
  HOST_UPDATE_SETTINGS: 'host:update-settings',
  HOST_WHEEL_DONE: 'host:wheel-done',
  PLAYER_BUZZ_IN: 'player:buzz-in',
  PLAYER_SPIN_WHEEL: 'player:spin-wheel',
  HOST_KICK_PLAYER: 'host:kick-player',
  REQUEST_SYNC: 'request:sync',

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

  // Party events
  PARTY_EVERYBODY_DRINKS: 'party:everybody-drinks',
  PARTY_ROCK_OFF: 'party:rock-off',
  PARTY_BUZZ_RESULT: 'party:buzz-result',
  ROCK_OFF_ASSIGN_DRINK: 'rockoff:assign-drink',

  // Milestone events
  MILESTONE_EARNED: 'milestone:earned',
  MILESTONE_USE_DRINKS: 'milestone:use-drinks',
  MILESTONE_USE_BLOCK: 'milestone:use-block',
  MILESTONE_DRINKS_RECEIVED: 'milestone:drinks-received',
  MILESTONE_BLOCK_RECEIVED: 'milestone:block-received',

  // Errors
  ERROR: 'error',
} as const;
