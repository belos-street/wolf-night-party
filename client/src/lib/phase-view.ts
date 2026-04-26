import type {
  ConnectionStatus,
  GameSnapshot,
  MainView
} from '../types/game-ui'

export const isNightPhase = (phase: string): boolean => {
  return phase.startsWith('NIGHT')
}

export const isDayPhase = (phase: string): boolean => {
  return phase.startsWith('DAY')
}

export const isVotePhase = (phase: string): boolean => {
  return phase === 'DAY_VOTE' || phase === 'DAY_REVOTE'
}

interface ResolveMainViewInput {
  sessionExists: boolean
  joinRejectedByRunning: boolean
  connectionStatus: ConnectionStatus
  snapshot: GameSnapshot | null
}

export const resolveMainView = ({
  sessionExists,
  joinRejectedByRunning,
  connectionStatus,
  snapshot
}: ResolveMainViewInput): MainView => {
  if (joinRejectedByRunning) {
    return 'NO_JOIN'
  }

  if (!sessionExists) {
    return 'JOIN'
  }

  if (connectionStatus === 'DISCONNECTED') {
    return 'DISCONNECT'
  }

  if (!snapshot) {
    return 'LOBBY'
  }

  if (snapshot.status === 'ENDED' || snapshot.phase === 'ENDED') {
    return 'END'
  }

  if (snapshot.status === 'WAITING' || snapshot.phase === 'WAITING') {
    return 'LOBBY'
  }

  if (
    snapshot.phase === 'ROLE_ASSIGNMENT' ||
    snapshot.phase === 'ROLE_VIEW'
  ) {
    return 'ROLE'
  }

  if (isNightPhase(snapshot.phase)) {
    return 'NIGHT'
  }

  if (isDayPhase(snapshot.phase)) {
    return 'DAY'
  }

  return 'LOBBY'
}
