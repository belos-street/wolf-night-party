import type { FastifyPluginAsync } from 'fastify'
import { ZodError } from 'zod'

import {
  advanceDayPhaseInRoom,
  applyDisconnectTimeoutByPlayerId,
  applyPhaseTimeoutInRoom,
  confirmRoleViewBySessionToken,
  createGameSnapshot,
  getPlayerBySessionToken,
  getPrivateRoleInfoBySessionToken,
  getRoomState,
  listPendingDisconnectCountdowns,
  markPlayerConnectedBySessionToken,
  markPlayerDisconnectedBySessionToken,
  startGameBySessionToken,
  submitDayVoteBySessionToken,
  submitGuardProtectBySessionToken,
  submitHunterShotBySessionToken,
  submitSeerCheckBySessionToken,
  submitWitchActionBySessionToken,
  submitWolfKillBySessionToken
} from '../../game/room-store.js'
import { CLIENT_WS_EVENTS, SERVER_WS_EVENTS } from '../../shared/constants/ws-events.js'
import {
  wsConnectQueryJsonSchema,
  wsEnvelopeSchema
} from '../../shared/schemas/api-schemas.js'

type WsIncomingData = string | Buffer | ArrayBuffer | Buffer[]

type WsConnectQuery = {
  sessionToken?: string
}

type WsLikeSocket = {
  close: (code?: number, reason?: string) => void
  on: (event: string, listener: (...args: unknown[]) => void) => void
  ping?: () => void
  readyState: number
  send: (data: string) => void
  terminate?: () => void
}

const WS_OPEN_STATE = 1
const HEARTBEAT_INTERVAL_MS = 15_000
const NO_TARGET = null

const WS_ERROR_MESSAGE_MAP: Record<string, string> = {
  BAD_REQUEST: 'WebSocket message schema validation failed',
  UNAUTHORIZED: 'Session token is invalid',
  PHASE_MISMATCH: 'Current phase does not allow this action',
  NOT_YOUR_TURN: 'This action is not available for current player',
  INVALID_TARGET: 'Target is invalid in current phase',
  INVALID_ACTION: 'Action payload is invalid',
  GAME_ALREADY_STARTED: 'Game already started',
  INVALID_PLAYER_COUNT: 'Player count must be between 6 and 12',
  HOST_ONLY_ACTION: 'Only host can trigger this action',
  GAME_ENDED: 'Game has already ended',
  PLAYER_DEAD: 'Dead player cannot act',
  PLAYER_NOT_FOUND: 'Player is not found',
  UNSUPPORTED_EVENT: 'Event is not supported in current version'
}

type WsEnvelope = ReturnType<typeof wsEnvelopeSchema.parse>

type WsExecutionSnapshot = {
  phase: string
  status: string
  deadCount: number
  voteSignature: string | null
  gameResultSignature: string | null
}

const parseJsonString = (message: WsIncomingData): unknown => {
  if (typeof message === 'string') {
    return JSON.parse(message)
  }

  if (message instanceof ArrayBuffer) {
    return JSON.parse(Buffer.from(message).toString())
  }

  if (Array.isArray(message)) {
    return JSON.parse(Buffer.concat(message).toString())
  }

  return JSON.parse(message.toString())
}

const resolveSessionToken = (
  headers: Record<string, unknown>,
  query: WsConnectQuery
): string | undefined => {
  const rawHeaderToken = headers['x-session-token']
  const headerToken =
    typeof rawHeaderToken === 'string' ? rawHeaderToken : undefined

  if (headerToken) {
    return headerToken
  }

  return query.sessionToken
}

const getRecordValue = (
  payload: Record<string, unknown>,
  key: string
): unknown => {
  return payload[key]
}

const getRequiredString = (
  payload: Record<string, unknown>,
  key: string
): string => {
  const rawValue = getRecordValue(payload, key)

  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    throw new Error('BAD_REQUEST')
  }

  return rawValue
}

const getOptionalString = (
  payload: Record<string, unknown>,
  key: string
): string | null => {
  const rawValue = getRecordValue(payload, key)

  if (rawValue === undefined || rawValue === null) {
    return null
  }

  if (typeof rawValue !== 'string') {
    throw new Error('BAD_REQUEST')
  }

  if (rawValue.trim().length === 0) {
    return null
  }

  return rawValue
}

const resolveWitchAction = (
  payload: Record<string, unknown>
): 'SAVE' | 'POISON' | 'SKIP' => {
  const rawAction = getRequiredString(payload, 'action').toUpperCase()

  if (rawAction === 'SAVE' || rawAction === 'POISON' || rawAction === 'SKIP') {
    return rawAction
  }

  throw new Error('BAD_REQUEST')
}

const buildVoteSignature = (
  voteResult: {
    eliminatedId: string | null
    isTie: boolean
    roundNo: 1 | 2
  } | null
): string | null => {
  if (!voteResult) {
    return null
  }

  return `${voteResult.roundNo}:${voteResult.eliminatedId ?? 'none'}:${
    voteResult.isTie
  }`
}

const buildGameResultSignature = (
  gameResult: {
    winner: string
    reason: string
    endedAt: number
  } | null
): string | null => {
  if (!gameResult) {
    return null
  }

  return `${gameResult.winner}:${gameResult.reason}:${gameResult.endedAt}`
}

const createExecutionSnapshot = (): WsExecutionSnapshot => {
  const roomState = getRoomState()

  return {
    phase: roomState.phase,
    status: roomState.status,
    deadCount: roomState.deadPlayers.length,
    voteSignature: buildVoteSignature(roomState.lastVoteResult),
    gameResultSignature: buildGameResultSignature(roomState.gameResult)
  }
}

const toGameOverPayload = () => {
  const roomState = getRoomState()

  return {
    winner: roomState.gameResult?.winner ?? 'GOOD',
    reason: roomState.gameResult?.reason ?? 'UNKNOWN',
    roles: roomState.players.map((player) => {
      return {
        playerId: player.id,
        role: player.role
      }
    })
  }
}

const resolveErrorDescriptor = (error: unknown) => {
  if (error instanceof ZodError) {
    return {
      code: 'BAD_REQUEST',
      message: WS_ERROR_MESSAGE_MAP.BAD_REQUEST
    }
  }

  if (error instanceof Error) {
    const code = error.message in WS_ERROR_MESSAGE_MAP ? error.message : 'BAD_REQUEST'

    return {
      code,
      message: WS_ERROR_MESSAGE_MAP[code] ?? 'Unknown websocket error'
    }
  }

  return {
    code: 'BAD_REQUEST',
    message: WS_ERROR_MESSAGE_MAP.BAD_REQUEST
  }
}

const wsRoutes: FastifyPluginAsync = async (fastify) => {
  const socketsByPlayerId = new Map<string, WsLikeSocket>()
  const sessionTokenByPlayerId = new Map<string, string>()
  const disconnectTimerByPlayerId = new Map<string, NodeJS.Timeout>()

  const sendEvent = (
    socket: WsLikeSocket,
    event: string,
    payload: Record<string, unknown>
  ) => {
    if (socket.readyState !== WS_OPEN_STATE) {
      return
    }

    socket.send(
      JSON.stringify({
        event,
        payload,
        ts: Date.now()
      })
    )
  }

  const sendError = (
    socket: WsLikeSocket,
    code: string,
    message: string
  ) => {
    sendEvent(socket, SERVER_WS_EVENTS.gameError, {
      code,
      message
    })
  }

  const broadcast = (
    event: string,
    payload: Record<string, unknown>,
    excludedPlayerId?: string
  ) => {
    socketsByPlayerId.forEach((socket, playerId) => {
      if (playerId === excludedPlayerId) {
        return
      }

      sendEvent(socket, event, payload)
    })
  }

  const sendSnapshotToAll = () => {
    const snapshot = createGameSnapshot()

    socketsByPlayerId.forEach((socket) => {
      sendEvent(socket, SERVER_WS_EVENTS.gameSnapshot, snapshot)
    })
  }

  const sendRoleInfoToPlayer = (playerId: string) => {
    const socket = socketsByPlayerId.get(playerId)
    const sessionToken = sessionTokenByPlayerId.get(playerId)

    if (!socket || !sessionToken) {
      return
    }

    try {
      const roleInfo = getPrivateRoleInfoBySessionToken(sessionToken)
      sendEvent(socket, SERVER_WS_EVENTS.gameRoleAssigned, roleInfo)
    } catch {
      // role info may not be ready in waiting state
    }
  }

  const sendRoleInfoToAllConnectedPlayers = () => {
    socketsByPlayerId.forEach((_socket, playerId) => {
      sendRoleInfoToPlayer(playerId)
    })
  }

  const emitStateDrivenEvents = (
    before: WsExecutionSnapshot,
    envelope: WsEnvelope
  ) => {
    const roomState = getRoomState()

    broadcast(SERVER_WS_EVENTS.gamePhaseChange, {
      phase: roomState.phase,
      receivedEvent: envelope.event,
      requestId: envelope.requestId ?? null
    })

    if (roomState.deadPlayers.length > before.deadCount) {
      const newDeaths = roomState.deadPlayers.slice(before.deadCount).map((death) => {
        return {
          playerId: death.playerId,
          role: death.revealedRole,
          cause: death.cause
        }
      })

      broadcast(SERVER_WS_EVENTS.gameDayReveal, {
        deaths: newDeaths
      })
    }

    const nextVoteSignature = buildVoteSignature(roomState.lastVoteResult)

    if (roomState.lastVoteResult && nextVoteSignature !== before.voteSignature) {
      broadcast(SERVER_WS_EVENTS.gameVoteResult, {
        eliminatedId: roomState.lastVoteResult.eliminatedId,
        isTie: roomState.lastVoteResult.isTie,
        roundNo: roomState.lastVoteResult.roundNo
      })
    }

    if (
      roomState.hunterActionState &&
      (roomState.phase === 'DAY_HUNTER_NIGHT' || roomState.phase === 'DAY_HUNTER_VOTE')
    ) {
      const hunterId = roomState.hunterActionState.hunterId
      const hunterSocket = socketsByPlayerId.get(hunterId)

      if (hunterSocket) {
        sendEvent(hunterSocket, SERVER_WS_EVENTS.gameHunterSkill, {
          canShoot: true
        })
      }
    }

    const nextGameResultSignature = buildGameResultSignature(roomState.gameResult)

    if (
      roomState.gameResult &&
      nextGameResultSignature !== before.gameResultSignature
    ) {
      broadcast(SERVER_WS_EVENTS.gameOver, toGameOverPayload())
    }

    if (envelope.event === CLIENT_WS_EVENTS.gameStart) {
      sendRoleInfoToAllConnectedPlayers()
    }

    if (before.phase !== roomState.phase || before.status !== roomState.status) {
      sendSnapshotToAll()
      return
    }

    // keep clients in sync even when phase does not change
    sendSnapshotToAll()
  }

  const executeClientEvent = (sessionToken: string, envelope: WsEnvelope) => {
    if (envelope.event === CLIENT_WS_EVENTS.gameStart) {
      startGameBySessionToken(sessionToken)
      return
    }

    if (envelope.event === CLIENT_WS_EVENTS.playerConfirmRole) {
      const roomState = getRoomState()

      if (roomState.phase === 'ROLE_VIEW') {
        confirmRoleViewBySessionToken(sessionToken)
        return
      }

      if (
        roomState.phase === 'DAY_REVEAL' ||
        roomState.phase === 'DAY_LAST_WORDS' ||
        roomState.phase === 'DAY_DISCUSSION' ||
        roomState.phase === 'DAY_VOTE_RESULT' ||
        roomState.phase === 'DAY_IDIOT_REVEAL'
      ) {
        advanceDayPhaseInRoom()
        return
      }

      if (
        roomState.phase === 'NIGHT_WOLF' ||
        roomState.phase === 'NIGHT_SEER' ||
        roomState.phase === 'NIGHT_GUARD' ||
        roomState.phase === 'NIGHT_WITCH' ||
        roomState.phase === 'DAY_VOTE' ||
        roomState.phase === 'DAY_REVOTE' ||
        roomState.phase === 'DAY_HUNTER_NIGHT' ||
        roomState.phase === 'DAY_HUNTER_VOTE'
      ) {
        applyPhaseTimeoutInRoom()
        return
      }

      throw new Error('PHASE_MISMATCH')
    }

    if (envelope.event === CLIENT_WS_EVENTS.playerLeave) {
      throw new Error('UNSUPPORTED_EVENT')
    }

    if (envelope.event === CLIENT_WS_EVENTS.nightSubmitKill) {
      const targetId = getRequiredString(envelope.payload, 'targetId')
      submitWolfKillBySessionToken(sessionToken, targetId)
      return
    }

    if (envelope.event === CLIENT_WS_EVENTS.nightSubmitSeer) {
      const targetId = getRequiredString(envelope.payload, 'targetId')
      submitSeerCheckBySessionToken(sessionToken, targetId)
      return
    }

    if (envelope.event === CLIENT_WS_EVENTS.nightSubmitGuard) {
      const targetId = getRequiredString(envelope.payload, 'targetId')
      submitGuardProtectBySessionToken(sessionToken, targetId)
      return
    }

    if (envelope.event === CLIENT_WS_EVENTS.nightSubmitWitch) {
      const action = resolveWitchAction(envelope.payload)
      const targetId = getOptionalString(envelope.payload, 'targetId') ?? undefined
      submitWitchActionBySessionToken(sessionToken, action, targetId)
      return
    }

    if (envelope.event === CLIENT_WS_EVENTS.daySubmitVote) {
      const targetId = getRequiredString(envelope.payload, 'targetId')
      const voteTarget = targetId === 'abstain' ? 'abstain' : targetId
      submitDayVoteBySessionToken(sessionToken, voteTarget)
      return
    }

    if (envelope.event === CLIENT_WS_EVENTS.daySubmitHunter) {
      const targetId = getOptionalString(envelope.payload, 'targetId')
      submitHunterShotBySessionToken(sessionToken, targetId ?? NO_TARGET)
      return
    }

    throw new Error('UNSUPPORTED_EVENT')
  }

  const clearDisconnectTimer = (playerId: string) => {
    const timer = disconnectTimerByPlayerId.get(playerId)

    if (timer) {
      clearTimeout(timer)
      disconnectTimerByPlayerId.delete(playerId)
    }
  }

  const handleDisconnectTimeout = (playerId: string) => {
    disconnectTimerByPlayerId.delete(playerId)

    const timeoutResult = applyDisconnectTimeoutByPlayerId(playerId)

    if (!timeoutResult.applied) {
      return
    }

    broadcast(SERVER_WS_EVENTS.gameDayReveal, {
      deaths: [timeoutResult.death]
    })

    if (timeoutResult.gameEnded) {
      broadcast(SERVER_WS_EVENTS.gameOver, toGameOverPayload())
      return
    }

    sendSnapshotToAll()
  }

  fastify.get<{ Querystring: WsConnectQuery }>(
    '/',
    {
      websocket: true,
      schema: {
        querystring: wsConnectQueryJsonSchema
      }
    },
    (socket, request) => {
      const wsSocket = socket as unknown as WsLikeSocket
      const sessionToken = resolveSessionToken(
        request.headers as Record<string, unknown>,
        request.query
      )

      if (
        typeof sessionToken !== 'string' ||
        !getPlayerBySessionToken(sessionToken)
      ) {
        sendError(wsSocket, 'UNAUTHORIZED', 'Session token is invalid')
        wsSocket.close()
        return
      }

      const connectedResult = markPlayerConnectedBySessionToken(sessionToken)
      const playerId = connectedResult.playerId

      sessionTokenByPlayerId.set(playerId, sessionToken)

      const previousSocket = socketsByPlayerId.get(playerId)

      if (previousSocket && previousSocket !== wsSocket) {
        previousSocket.close(4000, 'RECONNECTED_WITH_SAME_SESSION')
      }

      socketsByPlayerId.set(playerId, wsSocket)
      clearDisconnectTimer(playerId)

      if (connectedResult.wasDisconnected) {
        broadcast(SERVER_WS_EVENTS.gameReconnect, { playerId }, playerId)
      }

      sendEvent(wsSocket, SERVER_WS_EVENTS.gameSnapshot, createGameSnapshot())

      try {
        const roleInfo = getPrivateRoleInfoBySessionToken(sessionToken)
        const roomState = getRoomState()

        if (roomState.status !== 'WAITING') {
          sendEvent(wsSocket, SERVER_WS_EVENTS.gameRoleAssigned, roleInfo)
        }
      } catch {
        request.log.debug({ playerId }, 'role info is not ready yet')
      }

      const pendingCountdowns = listPendingDisconnectCountdowns()
      pendingCountdowns.forEach((countdown) => {
        sendEvent(wsSocket, SERVER_WS_EVENTS.gameDisconnect, countdown)
      })

      let heartbeatOk = true

      const heartbeatTimer = setInterval(() => {
        if (!heartbeatOk) {
          if (typeof wsSocket.terminate === 'function') {
            wsSocket.terminate()
          } else {
            wsSocket.close()
          }
          return
        }

        heartbeatOk = false

        if (typeof wsSocket.ping === 'function') {
          wsSocket.ping()
        }
      }, HEARTBEAT_INTERVAL_MS)

      wsSocket.on('pong', () => {
        heartbeatOk = true
      })

      wsSocket.on('error', (rawError) => {
        const error =
          rawError instanceof Error
            ? rawError
            : new Error('UNKNOWN_WEBSOCKET_ERROR')

        request.log.error({ err: error, playerId }, 'websocket connection error')
      })

      wsSocket.on('close', () => {
        clearInterval(heartbeatTimer)

        const currentSocket = socketsByPlayerId.get(playerId)

        // Ignore stale socket close events after same-session reconnect.
        if (currentSocket !== wsSocket) {
          return
        }

        socketsByPlayerId.delete(playerId)

        let disconnectedResult:
          | ReturnType<typeof markPlayerDisconnectedBySessionToken>
          | null = null

        try {
          disconnectedResult = markPlayerDisconnectedBySessionToken(sessionToken)
        } catch (error) {
          request.log.warn({ err: error, playerId }, 'skip disconnect state update')
        }

        if (disconnectedResult?.startCountdown) {
          const countdownSec = Math.ceil(disconnectedResult.countdownMs / 1000)

          broadcast(SERVER_WS_EVENTS.gameDisconnect, {
            playerId,
            countdownSec
          })

          clearDisconnectTimer(playerId)
          const timer = setTimeout(() => {
            handleDisconnectTimeout(playerId)
          }, disconnectedResult.countdownMs)

          disconnectTimerByPlayerId.set(playerId, timer)
        }
      })

      wsSocket.on('message', (rawMessage) => {
        try {
          const payload = parseJsonString(rawMessage as WsIncomingData)
          const envelope = wsEnvelopeSchema.parse(payload)

          if (envelope.event === CLIENT_WS_EVENTS.uiRequestHelp) {
            sendEvent(wsSocket, SERVER_WS_EVENTS.gameNightAction, {
              title: 'HELP',
              summary: 'Use lobby/phase hints and role prompts to play this round.'
            })
            return
          }

          const executionBefore = createExecutionSnapshot()

          executeClientEvent(sessionToken, envelope)
          emitStateDrivenEvents(executionBefore, envelope)
        } catch (error) {
          const descriptor = resolveErrorDescriptor(error)
          request.log.warn(
            {
              err: error,
              playerId
            },
            'websocket message rejected'
          )
          sendError(wsSocket, descriptor.code, descriptor.message)
        }
      })
    }
  )
}

export default wsRoutes
