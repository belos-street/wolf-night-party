export type Team = 'GOOD' | 'WOLF'

export type VictoryRule = 'MASSACRE' | 'SIDE_KILL'

export type RoleKind =
  | 'VILLAGER'
  | 'WOLF'
  | 'SEER'
  | 'WITCH'
  | 'HUNTER'
  | 'GUARD'
  | 'IDIOT'

export type ConnectionState = 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING'

export type DeathCause =
  | 'WOLF_KILL'
  | 'VOTE_OUT'
  | 'WITCH_POISON'
  | 'HUNTER_SHOT'
  | 'DISCONNECT_TIMEOUT'

export interface PlayerState {
  id: string
  nickname: string
  avatarId: string
  seatNo: number
  isHost: boolean
  role: RoleKind
  team: Team
  alive: boolean
  canVote: boolean
  connection: ConnectionState
  sessionTokenHash: string
}

export interface PlayerPublic {
  id: string
  nickname: string
  avatarId: string
  seatNo: number
  isHost: boolean
  alive: boolean
}

export interface RoomConfig {
  playerCount: number
  victoryRule: VictoryRule
  presetId: string
}

export interface DeathRecord {
  playerId: string
  cause: DeathCause
  atPhase: string
  canLastWords: boolean
  revealedRole: RoleKind
}

export interface RoomState {
  roomId: string
  status: 'WAITING' | 'RUNNING' | 'ENDED'
  round: number
  phase: string
  players: PlayerState[]
  config: RoomConfig
  deadPlayers: DeathRecord[]
  createdAt: number
  updatedAt: number
}
