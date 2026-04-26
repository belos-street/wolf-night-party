import type { JoinResponse } from '../shared/types/api-contract'

export type RoomStatus = 'WAITING' | 'RUNNING' | 'ENDED'

export type ConnectionStatus =
  | 'IDLE'
  | 'JOINING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'

export type MainView =
  | 'JOIN'
  | 'NO_JOIN'
  | 'LOBBY'
  | 'ROLE'
  | 'NIGHT'
  | 'DAY'
  | 'END'
  | 'DISCONNECT'

export interface PlayerPublicSnapshot {
  id: string
  nickname: string
  avatarId: string
  seatNo: number
  isHost: boolean
  alive: boolean
}

export interface GameSnapshot {
  roomId: string
  status: RoomStatus
  phase: string
  players: PlayerPublicSnapshot[]
}

export interface RoleInfo {
  role: string
  description: string
}

export interface DisconnectNotice {
  playerId: string
  countdownSec: number
}

export interface DayDeath {
  playerId: string
  role?: string
  cause?: string
}

export interface VoteResultInfo {
  eliminatedId: string | null
  isTie: boolean
}

export interface GameOverRole {
  playerId: string
  role: string
}

export interface GameOverInfo {
  winner: 'GOOD' | 'WOLF'
  reason: string
  roles: GameOverRole[]
}

export interface GameClientData {
  session: JoinResponse | null
  snapshot: GameSnapshot | null
  roleInfo: RoleInfo | null
  dayDeaths: DayDeath[]
  voteResult: VoteResultInfo | null
  gameOverInfo: GameOverInfo | null
  pendingDisconnects: DisconnectNotice[]
  remoteHelpSummary: string | null
}
