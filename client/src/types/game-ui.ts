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

export interface WitchOptions {
  canSave: boolean
  canPoison: boolean
  isSelfTargeted: boolean
  round: number
}

export interface SeerCheckRecord {
  targetId: string
  targetName: string
  alignment: 'GOOD' | 'WOLF'
  round: number
  checkedAt: number
}

export interface WolfVoteHint {
  wolfId: string
  wolfName: string
  targetId: string
  targetName: string
}

export interface WitchKillHintRecord {
  targetId: string
  targetName: string
  round: number
  receivedAt: number
}

export interface RevoteCandidate {
  playerId: string
  playerName: string
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
  eliminatedName: string | null
  isTie: boolean
  roundNo: 1 | 2
  ballots: VoteBallotInfo[]
}

export interface VoteBallotInfo {
  voterId: string
  voterName: string
  targetId: string | null
  targetName: string | null
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
  witchOptions: WitchOptions | null
  seerChecks: SeerCheckRecord[]
  wolfVoteHints: WolfVoteHint[]
  witchKillHints: WitchKillHintRecord[]
  revoteCandidates: RevoteCandidate[]
  dayDeaths: DayDeath[]
  voteResult: VoteResultInfo | null
  voteCountdownSec: number | null
  gameOverInfo: GameOverInfo | null
  pendingDisconnects: DisconnectNotice[]
  remoteHelpSummary: string | null
}
