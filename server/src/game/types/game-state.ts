import type {
  DeathRecord,
  PlayerState,
  RoomConfig,
  Team
} from '../../shared/types/domain-models.js'
import type { GamePhase } from '../constants/game-phases.js'

export interface NightActionState {
  wolfVotes: Record<string, string>
  seerTargetId?: string
  guardTargetId?: string
  witchAction: 'SAVE' | 'POISON' | 'SKIP' | null
  witchTargetId?: string
}

export interface VoteActionState {
  roundNo: 1 | 2
  candidates: string[]
  ballots: Record<string, string | 'abstain'>
}

export interface HunterActionState {
  source: 'NIGHT' | 'VOTE'
  hunterId: string
}

export interface GameResult {
  winner: Team
  reason: string
  endedAt: number
}

export interface InternalRoomState {
  roomId: string
  status: 'WAITING' | 'RUNNING' | 'ENDED'
  round: number
  phase: GamePhase
  players: PlayerState[]
  config: RoomConfig
  deadPlayers: DeathRecord[]
  createdAt: number
  updatedAt: number
  roleViewConfirmedPlayerIds: string[]
  nightActionState: NightActionState | null
  voteActionState: VoteActionState | null
  hunterActionState: HunterActionState | null
  witchState: {
    saveAvailable: boolean
    poisonAvailable: boolean
  }
  lastGuardTargetId: string | null
  lastVoteResult: {
    eliminatedId: string | null
    isTie: boolean
    roundNo: 1 | 2
  } | null
  gameResult: GameResult | null
}
