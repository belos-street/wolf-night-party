export const ROOM_ID = 'room_local'

export const PLAYER_COUNT_LIMITS = {
  min: 6,
  max: 12
} as const

export const GAME_STATUS = {
  waiting: 'WAITING',
  running: 'RUNNING',
  ended: 'ENDED'
} as const

export const GAME_PHASE = {
  waiting: 'WAITING'
} as const
