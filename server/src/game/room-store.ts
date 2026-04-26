import { createHash, randomUUID } from 'node:crypto'

import { GAME_PHASES } from './constants/game-phases.js'
import {
  applyPhaseTimeout,
  advanceDayPhase,
  confirmRoleView,
  evaluateVictory,
  getPrivateRoleInfo,
  startGame,
  submitDayVote,
  submitGuardProtect,
  submitHunterShot,
  submitSeerCheck,
  submitWitchAction,
  submitWolfKill
} from './game-engine.js'
import type { InternalRoomState } from './types/game-state.js'
import {
  GAME_STATUS,
  PLAYER_COUNT_LIMITS,
  ROOM_ID
} from '../shared/constants/game-constants.js'
import type { JoinResponse } from '../shared/types/api-contract.js'
import type {
  DeathCause,
  PlayerPublic,
  PlayerState
} from '../shared/types/domain-models.js'

const DISCONNECT_COUNTDOWN_MS = 120_000

const createInitialRoomState = (): InternalRoomState => {
  const now = Date.now()

  return {
    roomId: ROOM_ID,
    status: GAME_STATUS.waiting,
    round: 0,
    phase: GAME_PHASES.waiting,
    players: [],
    config: {
      playerCount: 0,
      victoryRule: 'MASSACRE',
      presetId: 'standard_waiting'
    },
    deadPlayers: [],
    createdAt: now,
    updatedAt: now,
    roleViewConfirmedPlayerIds: [],
    nightActionState: null,
    voteActionState: null,
    hunterActionState: null,
    witchState: {
      saveAvailable: true,
      poisonAvailable: true
    },
    lastGuardTargetId: null,
    lastVoteResult: null,
    gameResult: null
  }
}

let roomState = createInitialRoomState()

const sessionToPlayerId = new Map<string, string>()
const disconnectDeadlineByPlayerId = new Map<string, number>()

const createSessionToken = (): string => {
  return randomUUID()
}

const hashSessionToken = (sessionToken: string): string => {
  return createHash('sha256').update(sessionToken).digest('hex')
}

const resolvePlayerIdBySessionToken = (sessionToken: string): string => {
  const playerId = sessionToPlayerId.get(sessionToken)

  if (!playerId) {
    throw new Error('UNAUTHORIZED')
  }

  return playerId
}

export const joinRoom = (nickname: string, avatarId: string): JoinResponse => {
  if (roomState.status !== GAME_STATUS.waiting) {
    throw new Error('GAME_ALREADY_STARTED')
  }

  if (roomState.players.length >= PLAYER_COUNT_LIMITS.max) {
    throw new Error('PLAYER_LIMIT_EXCEEDED')
  }

  const sessionToken = createSessionToken()
  const playerId = `p_${randomUUID().slice(0, 8)}`
  const nextSeatNo = roomState.players.length + 1
  const isHost = roomState.players.length === 0

  const player: PlayerState = {
    id: playerId,
    nickname,
    avatarId,
    seatNo: nextSeatNo,
    isHost,
    role: 'VILLAGER',
    team: 'GOOD',
    alive: true,
    canVote: true,
    connection: 'CONNECTED',
    sessionTokenHash: hashSessionToken(sessionToken)
  }

  roomState.players.push(player)
  roomState.config.playerCount = roomState.players.length
  roomState.config.victoryRule =
    roomState.players.length >= 10 ? 'SIDE_KILL' : 'MASSACRE'
  roomState.config.presetId = `standard_${roomState.players.length}`
  roomState.updatedAt = Date.now()

  sessionToPlayerId.set(sessionToken, playerId)

  return {
    roomId: roomState.roomId,
    playerId,
    sessionToken,
    isHost
  }
}

export const getRoomState = (): InternalRoomState => {
  return roomState
}

export const getPlayerBySessionToken = (
  sessionToken: string
): PlayerState | undefined => {
  const playerId = sessionToPlayerId.get(sessionToken)

  if (!playerId) {
    return undefined
  }

  return roomState.players.find((player) => player.id === playerId)
}

export const createGameSnapshot = () => {
  const players: PlayerPublic[] = roomState.players.map((player) => {
    return {
      id: player.id,
      nickname: player.nickname,
      avatarId: player.avatarId,
      seatNo: player.seatNo,
      isHost: player.isHost,
      alive: player.alive
    }
  })

  return {
    roomId: roomState.roomId,
    status: roomState.status,
    phase: roomState.phase,
    players
  }
}

const addDeathRecord = (
  playerId: string,
  cause: DeathCause,
  canLastWords: boolean
) => {
  const player = roomState.players.find((item) => item.id === playerId)

  if (!player || !player.alive) {
    return null
  }

  player.alive = false
  player.canVote = false

  roomState.deadPlayers.push({
    playerId,
    cause,
    atPhase: roomState.phase,
    canLastWords,
    revealedRole: player.role
  })

  return {
    playerId,
    role: player.role,
    cause
  }
}

export const markPlayerConnectedBySessionToken = (sessionToken: string) => {
  const playerId = resolvePlayerIdBySessionToken(sessionToken)
  const player = roomState.players.find((item) => item.id === playerId)

  if (!player) {
    throw new Error('PLAYER_NOT_FOUND')
  }

  const wasDisconnected = player.connection !== 'CONNECTED'

  player.connection = 'CONNECTED'
  roomState.updatedAt = Date.now()

  disconnectDeadlineByPlayerId.delete(playerId)

  return {
    playerId,
    wasDisconnected
  }
}

export const markPlayerDisconnectedBySessionToken = (sessionToken: string) => {
  const playerId = resolvePlayerIdBySessionToken(sessionToken)
  const player = roomState.players.find((item) => item.id === playerId)

  if (!player) {
    throw new Error('PLAYER_NOT_FOUND')
  }

  player.connection = 'DISCONNECTED'
  roomState.updatedAt = Date.now()

  if (roomState.status !== GAME_STATUS.running || !player.alive) {
    disconnectDeadlineByPlayerId.delete(playerId)
    return {
      playerId,
      startCountdown: false,
      countdownMs: 0
    }
  }

  const deadlineMs = Date.now() + DISCONNECT_COUNTDOWN_MS
  disconnectDeadlineByPlayerId.set(playerId, deadlineMs)

  return {
    playerId,
    startCountdown: true,
    countdownMs: DISCONNECT_COUNTDOWN_MS
  }
}

export const getDisconnectDeadlineByPlayerId = (playerId: string) => {
  return disconnectDeadlineByPlayerId.get(playerId) ?? null
}

export const hasPendingDisconnectCountdown = (): boolean => {
  return disconnectDeadlineByPlayerId.size > 0
}

export const listPendingDisconnectCountdowns = (
  nowMs: number = Date.now()
): Array<{
  playerId: string
  countdownSec: number
}> => {
  const countdowns: Array<{ playerId: string; countdownSec: number }> = []

  disconnectDeadlineByPlayerId.forEach((deadlineMs, playerId) => {
    const countdownSec = Math.max(1, Math.ceil((deadlineMs - nowMs) / 1000))

    countdowns.push({
      playerId,
      countdownSec
    })
  })

  return countdowns
}

export const applyDisconnectTimeoutByPlayerId = (playerId: string) => {
  const deadlineMs = disconnectDeadlineByPlayerId.get(playerId)

  if (!deadlineMs) {
    return {
      applied: false as const,
      gameEnded: roomState.status === GAME_STATUS.ended
    }
  }

  disconnectDeadlineByPlayerId.delete(playerId)

  const death = addDeathRecord(playerId, 'DISCONNECT_TIMEOUT', false)

  if (!death) {
    return {
      applied: false as const,
      gameEnded: roomState.status === GAME_STATUS.ended
    }
  }

  evaluateVictory(roomState)
  roomState.updatedAt = Date.now()

  return {
    applied: true as const,
    gameEnded: roomState.status === GAME_STATUS.ended,
    death
  }
}

export const startGameBySessionToken = (
  sessionToken: string,
  randomFn: () => number = Math.random
) => {
  const playerId = resolvePlayerIdBySessionToken(sessionToken)
  startGame(roomState, playerId, randomFn)
}

export const confirmRoleViewBySessionToken = (sessionToken: string) => {
  const playerId = resolvePlayerIdBySessionToken(sessionToken)
  confirmRoleView(roomState, playerId)
}

export const submitWolfKillBySessionToken = (
  sessionToken: string,
  targetId: string
) => {
  const playerId = resolvePlayerIdBySessionToken(sessionToken)
  submitWolfKill(roomState, playerId, targetId)
}

export const submitSeerCheckBySessionToken = (
  sessionToken: string,
  targetId: string
) => {
  const playerId = resolvePlayerIdBySessionToken(sessionToken)
  submitSeerCheck(roomState, playerId, targetId)
}

export const submitGuardProtectBySessionToken = (
  sessionToken: string,
  targetId: string
) => {
  const playerId = resolvePlayerIdBySessionToken(sessionToken)
  submitGuardProtect(roomState, playerId, targetId)
}

export const submitWitchActionBySessionToken = (
  sessionToken: string,
  action: 'SAVE' | 'POISON' | 'SKIP',
  targetId?: string
) => {
  const playerId = resolvePlayerIdBySessionToken(sessionToken)
  submitWitchAction(roomState, playerId, action, targetId)
}

export const submitDayVoteBySessionToken = (
  sessionToken: string,
  targetId: string | 'abstain'
) => {
  const playerId = resolvePlayerIdBySessionToken(sessionToken)
  submitDayVote(roomState, playerId, targetId)
}

export const submitHunterShotBySessionToken = (
  sessionToken: string,
  targetId: string | null
) => {
  const playerId = resolvePlayerIdBySessionToken(sessionToken)
  submitHunterShot(roomState, playerId, targetId)
}

export const advanceDayPhaseInRoom = () => {
  advanceDayPhase(roomState)
}

export const applyPhaseTimeoutInRoom = () => {
  applyPhaseTimeout(roomState)
}

export const getPrivateRoleInfoBySessionToken = (sessionToken: string) => {
  const playerId = resolvePlayerIdBySessionToken(sessionToken)
  return getPrivateRoleInfo(roomState, playerId)
}

export const evaluateVictoryInRoom = () => {
  return evaluateVictory(roomState)
}

export const resetRoomStore = () => {
  roomState = createInitialRoomState()
  sessionToPlayerId.clear()
  disconnectDeadlineByPlayerId.clear()
}
