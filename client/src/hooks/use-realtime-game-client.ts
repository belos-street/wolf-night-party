import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { resolveHttpBaseUrl, resolveWsBaseUrl } from '../lib/network'
import { resolveMainView } from '../lib/phase-view'
import {
  CLIENT_WS_EVENTS,
  SERVER_WS_EVENTS,
  type ClientWsEvent
} from '../shared/constants/ws-events'
import type { ApiResponse, JoinResponse } from '../shared/types/api-contract'
import type {
  ConnectionStatus,
  DayDeath,
  DisconnectNotice,
  GameOverInfo,
  GameOverRole,
  GameSnapshot,
  MainView,
  PlayerPublicSnapshot,
  RevoteCandidate,
  RoleInfo,
  SeerCheckRecord,
  WitchKillHintRecord,
  WitchOptions,
  WolfVoteHint,
  VoteResultInfo
} from '../types/game-ui'

const WS_OPEN_STATE = 1
const RECONNECT_DELAY_MS = 2500
const DISCONNECT_COUNTDOWN_SEC = 120
const SESSION_STORAGE_KEY = 'wolf-night-party:session'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const readString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null
}

const readNumber = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const parsePlayer = (rawPlayer: unknown): PlayerPublicSnapshot | null => {
  if (!isRecord(rawPlayer)) {
    return null
  }

  const id = readString(rawPlayer.id)
  const nickname = readString(rawPlayer.nickname)
  const avatarId = readString(rawPlayer.avatarId) ?? 'avatar_01'
  const seatNo = readNumber(rawPlayer.seatNo)
  const isHost = rawPlayer.isHost === true
  const alive = rawPlayer.alive !== false

  if (!id || !nickname || seatNo === null) {
    return null
  }

  return {
    id,
    nickname,
    avatarId,
    seatNo,
    isHost,
    alive
  }
}

const parseSnapshot = (payload: Record<string, unknown>): GameSnapshot | null => {
  const roomId = readString(payload.roomId)
  const status = readString(payload.status)
  const phase = readString(payload.phase)

  if (!roomId || !status || !phase) {
    return null
  }

  if (status !== 'WAITING' && status !== 'RUNNING' && status !== 'ENDED') {
    return null
  }

  const players = Array.isArray(payload.players)
    ? payload.players
        .map((item) => parsePlayer(item))
        .filter((item): item is PlayerPublicSnapshot => item !== null)
    : []

  return {
    roomId,
    status,
    phase,
    players
  }
}

const parseRoleInfo = (payload: Record<string, unknown>): RoleInfo | null => {
  const role = readString(payload.role)
  const description = readString(payload.description)

  if (!role || !description) {
    return null
  }

  return {
    role,
    description
  }
}

const parseDisconnectNotice = (
  payload: Record<string, unknown>
): DisconnectNotice | null => {
  const playerId = readString(payload.playerId)
  const countdownSec = readNumber(payload.countdownSec)

  if (!playerId || countdownSec === null) {
    return null
  }

  return {
    playerId,
    countdownSec
  }
}

const parseDeaths = (payload: Record<string, unknown>): DayDeath[] => {
  if (!Array.isArray(payload.deaths)) {
    return []
  }

  const deaths: DayDeath[] = []

  payload.deaths.forEach((rawDeath) => {
    if (!isRecord(rawDeath)) {
      return
    }

    const playerId = readString(rawDeath.playerId)

    if (!playerId) {
      return
    }

    deaths.push({
      playerId,
      role: readString(rawDeath.role) ?? undefined,
      cause: readString(rawDeath.cause) ?? undefined
    })
  })

  return deaths
}

const parseVoteResult = (
  payload: Record<string, unknown>
): VoteResultInfo | null => {
  const eliminatedIdRaw = payload.eliminatedId
  const eliminatedNameRaw = payload.eliminatedName
  const isTie = payload.isTie === true
  const roundNoRaw = payload.roundNo

  if (eliminatedIdRaw !== null && typeof eliminatedIdRaw !== 'string') {
    return null
  }

  if (eliminatedNameRaw !== null && typeof eliminatedNameRaw !== 'string') {
    return null
  }

  if (roundNoRaw !== 1 && roundNoRaw !== 2) {
    return null
  }

  const ballots = Array.isArray(payload.ballots)
    ? payload.ballots
        .map((rawBallot) => {
          if (!isRecord(rawBallot)) {
            return null
          }

          const voterId = readString(rawBallot.voterId)
          const voterName = readString(rawBallot.voterName)
          const targetIdRaw = rawBallot.targetId
          const targetNameRaw = rawBallot.targetName

          if (!voterId || !voterName) {
            return null
          }

          if (targetIdRaw !== null && typeof targetIdRaw !== 'string') {
            return null
          }

          if (targetNameRaw !== null && typeof targetNameRaw !== 'string') {
            return null
          }

          return {
            voterId,
            voterName,
            targetId: targetIdRaw ?? null,
            targetName: targetNameRaw ?? null
          }
        })
        .filter((ballot): ballot is VoteResultInfo['ballots'][number] => ballot !== null)
    : []

  return {
    eliminatedId: eliminatedIdRaw ?? null,
    eliminatedName: eliminatedNameRaw ?? null,
    isTie,
    roundNo: roundNoRaw,
    ballots
  }
}

const parseGameOverInfo = (
  payload: Record<string, unknown>
): GameOverInfo | null => {
  const winner = readString(payload.winner)
  const reason = readString(payload.reason) ?? 'UNKNOWN'

  if (winner !== 'GOOD' && winner !== 'WOLF') {
    return null
  }

  const roles: GameOverRole[] = Array.isArray(payload.roles)
    ? payload.roles
        .map((rawRole) => {
          if (!isRecord(rawRole)) {
            return null
          }

          const playerId = readString(rawRole.playerId)
          const role = readString(rawRole.role)

          if (!playerId || !role) {
            return null
          }

          return {
            playerId,
            role
          }
        })
        .filter((item): item is GameOverRole => item !== null)
    : []

  return {
    winner,
    reason,
    roles
  }
}

const parseSeerCheckRecord = (
  payload: Record<string, unknown>
): SeerCheckRecord | null => {
  const title = readString(payload.title)

  if (title !== 'SEER_RESULT') {
    return null
  }

  const targetId = readString(payload.targetId)
  const targetName = readString(payload.targetName)
  const alignment = readString(payload.alignment)
  const round = readNumber(payload.round)
  const checkedAt = readNumber(payload.checkedAt) ?? Date.now()

  if (!targetId || !targetName || !alignment || round === null) {
    return null
  }

  if (alignment !== 'GOOD' && alignment !== 'WOLF') {
    return null
  }

  return {
    targetId,
    targetName,
    alignment,
    round,
    checkedAt
  }
}

const parseWolfVoteHints = (payload: Record<string, unknown>): WolfVoteHint[] | null => {
  const title = readString(payload.title)

  if (title !== 'WOLF_SYNC') {
    return null
  }

  if (!Array.isArray(payload.votes)) {
    return []
  }

  const hints: WolfVoteHint[] = []

  payload.votes.forEach((rawVote) => {
    if (!isRecord(rawVote)) {
      return
    }

    const wolfId = readString(rawVote.wolfId)
    const wolfName = readString(rawVote.wolfName)
    const targetId = readString(rawVote.targetId)
    const targetName = readString(rawVote.targetName)

    if (!wolfId || !wolfName || !targetId || !targetName) {
      return
    }

    hints.push({
      wolfId,
      wolfName,
      targetId,
      targetName
    })
  })

  return hints
}

const parseWitchOptions = (payload: Record<string, unknown>): WitchOptions | null => {
  const title = readString(payload.title)

  if (title !== 'WITCH_OPTIONS') {
    return null
  }

  const round = readNumber(payload.round)

  if (round === null) {
    return null
  }

  return {
    canSave: payload.canSave === true,
    canPoison: payload.canPoison === true,
    isSelfTargeted: payload.isSelfTargeted === true,
    round
  }
}

const parseWitchKillHint = (
  payload: Record<string, unknown>
): WitchKillHintRecord | null => {
  const title = readString(payload.title)

  if (title !== 'WITCH_WOLF_TARGET') {
    return null
  }

  const targetId = readString(payload.targetId)
  const targetName = readString(payload.targetName)
  const round = readNumber(payload.round)
  const receivedAt = readNumber(payload.receivedAt) ?? Date.now()

  if (!targetId || !targetName || round === null) {
    return null
  }

  return {
    targetId,
    targetName,
    round,
    receivedAt
  }
}

const parseRevoteCandidates = (
  payload: Record<string, unknown>
): RevoteCandidate[] => {
  if (!Array.isArray(payload.pkCandidates)) {
    return []
  }

  return payload.pkCandidates
    .map((rawCandidate) => {
      if (!isRecord(rawCandidate)) {
        return null
      }

      const playerId = readString(rawCandidate.playerId)
      const playerName = readString(rawCandidate.playerName)

      if (!playerId || !playerName) {
        return null
      }

      return {
        playerId,
        playerName
      }
    })
    .filter((item): item is RevoteCandidate => item !== null)
}

type ParsedServerEvent = {
  event: string
  payload: Record<string, unknown>
  ts: number
}

const parseServerEvent = (rawMessage: string): ParsedServerEvent | null => {
  try {
    const parsed = JSON.parse(rawMessage)

    if (!isRecord(parsed)) {
      return null
    }

    const event = readString(parsed.event)
    const payload = isRecord(parsed.payload) ? parsed.payload : null
    const ts = readNumber(parsed.ts) ?? Date.now()

    if (!event || !payload) {
      return null
    }

    return {
      event,
      payload,
      ts
    }
  } catch {
    return null
  }
}

const isJoinResponse = (value: unknown): value is JoinResponse => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.roomId === 'string' &&
    value.roomId.length > 0 &&
    typeof value.playerId === 'string' &&
    value.playerId.length > 0 &&
    typeof value.sessionToken === 'string' &&
    value.sessionToken.length > 0 &&
    typeof value.isHost === 'boolean'
  )
}

const readPersistedSession = (): JoinResponse | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.sessionStorage.getItem(SESSION_STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    const parsedValue = JSON.parse(rawValue)

    if (!isJoinResponse(parsedValue)) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }

    return parsedValue
  } catch {
    return null
  }
}

const persistSession = (session: JoinResponse | null): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (!session) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
      return
    }

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Ignore storage failures to keep gameplay flow available.
  }
}

interface UseRealtimeGameClientOptions {
  enabled?: boolean
}

export const useRealtimeGameClient = (
  options: UseRealtimeGameClientOptions = {}
) => {
  const { enabled = true } = options
  const httpBaseUrl = useMemo(() => resolveHttpBaseUrl(), [])
  const wsBaseUrl = useMemo(() => resolveWsBaseUrl(httpBaseUrl), [httpBaseUrl])

  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const countdownTimerRef = useRef<number | null>(null)
  const voteCountdownTimerRef = useRef<number | null>(null)

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('IDLE')
  const [session, setSession] = useState<JoinResponse | null>(() => {
    return readPersistedSession()
  })
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null)
  const [roleInfo, setRoleInfo] = useState<RoleInfo | null>(null)
  const [witchOptions, setWitchOptions] = useState<WitchOptions | null>(null)
  const [seerChecks, setSeerChecks] = useState<SeerCheckRecord[]>([])
  const [wolfVoteHints, setWolfVoteHints] = useState<WolfVoteHint[]>([])
  const [witchKillHints, setWitchKillHints] = useState<WitchKillHintRecord[]>([])
  const [revoteCandidates, setRevoteCandidates] = useState<RevoteCandidate[]>([])
  const [pendingSeerResult, setPendingSeerResult] =
    useState<SeerCheckRecord | null>(null)
  const [pendingWitchKillHint, setPendingWitchKillHint] =
    useState<WitchKillHintRecord | null>(null)
  const [dayDeaths, setDayDeaths] = useState<DayDeath[]>([])
  const [voteResult, setVoteResult] = useState<VoteResultInfo | null>(null)
  const [voteCountdownSec, setVoteCountdownSec] = useState<number | null>(null)
  const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null)
  const [pendingDisconnects, setPendingDisconnects] = useState<
    DisconnectNotice[]
  >([])
  const [disconnectCountdownSec, setDisconnectCountdownSec] = useState(
    DISCONNECT_COUNTDOWN_SEC
  )
  const [remoteHelpSummary, setRemoteHelpSummary] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [joinRejectedByRunning, setJoinRejectedByRunning] = useState(false)

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  }, [])

  const clearVoteCountdownTimer = useCallback(() => {
    if (voteCountdownTimerRef.current !== null) {
      window.clearInterval(voteCountdownTimerRef.current)
      voteCountdownTimerRef.current = null
    }
  }, [])

  const clearErrorMessage = useCallback(() => {
    setErrorMessage(null)
  }, [])

  const dismissSeerResult = useCallback(() => {
    setPendingSeerResult(null)
  }, [])

  const dismissWitchKillHint = useCallback(() => {
    setPendingWitchKillHint(null)
  }, [])

  const disposeSocket = useCallback(() => {
    const currentSocket = socketRef.current

    if (!currentSocket) {
      return
    }

    currentSocket.onopen = null
    currentSocket.onmessage = null
    currentSocket.onclose = null
    currentSocket.onerror = null
    currentSocket.close()
    socketRef.current = null
  }, [])

  const resetSessionScopedState = useCallback(() => {
    setSession(null)
    setSnapshot(null)
    setRoleInfo(null)
    setWitchOptions(null)
    setSeerChecks([])
    setWolfVoteHints([])
    setWitchKillHints([])
    setRevoteCandidates([])
    setPendingSeerResult(null)
    setPendingWitchKillHint(null)
    setDayDeaths([])
    setVoteResult(null)
    setVoteCountdownSec(null)
    setGameOverInfo(null)
    setPendingDisconnects([])
    setJoinRejectedByRunning(false)
  }, [])

  const handleServerEvent = useCallback(
    (serverEvent: ParsedServerEvent) => {
      const payload = isRecord(serverEvent.payload) ? serverEvent.payload : {}

      if (serverEvent.event === SERVER_WS_EVENTS.gameSnapshot) {
        const nextSnapshot = parseSnapshot(payload)

        if (nextSnapshot) {
          setSnapshot(nextSnapshot)
          setJoinRejectedByRunning(false)
        }
        return
      }

      if (serverEvent.event === SERVER_WS_EVENTS.gameRoleAssigned) {
        const nextRoleInfo = parseRoleInfo(payload)

        if (nextRoleInfo) {
          setRoleInfo(nextRoleInfo)
        }
        return
      }

      if (serverEvent.event === SERVER_WS_EVENTS.gameDisconnect) {
        const notice = parseDisconnectNotice(payload)

        if (!notice) {
          return
        }

        setPendingDisconnects((current) => {
          const withoutTarget = current.filter((item) => {
            return item.playerId !== notice.playerId
          })
          return [...withoutTarget, notice]
        })
        return
      }

      if (serverEvent.event === SERVER_WS_EVENTS.gameReconnect) {
        const playerId = readString(payload.playerId)

        if (!playerId) {
          return
        }

        setPendingDisconnects((current) => {
          return current.filter((item) => item.playerId !== playerId)
        })
        return
      }

      if (serverEvent.event === SERVER_WS_EVENTS.gameNightAction) {
        const title = readString(payload.title)
        const summary = readString(payload.summary)
        const seerResult = parseSeerCheckRecord(payload)
        const wolfSyncHints = parseWolfVoteHints(payload)
        const nextWitchOptions = parseWitchOptions(payload)
        const witchKillHint = parseWitchKillHint(payload)

        if (seerResult) {
          setSeerChecks((current) => {
            const duplicated = current.some((item) => {
              return (
                item.targetId === seerResult.targetId &&
                item.round === seerResult.round &&
                item.checkedAt === seerResult.checkedAt
              )
            })

            if (duplicated) {
              return current
            }

            return [seerResult, ...current]
          })
          setPendingSeerResult(seerResult)
          return
        }

        if (wolfSyncHints) {
          setWolfVoteHints(wolfSyncHints)
          return
        }

        if (nextWitchOptions) {
          setWitchOptions(nextWitchOptions)
          return
        }

        if (witchKillHint) {
          setWitchKillHints((current) => {
            const withoutCurrentRound = current.filter((item) => {
              return item.round !== witchKillHint.round
            })

            return [witchKillHint, ...withoutCurrentRound]
          })
          setPendingWitchKillHint(witchKillHint)
          setInfoMessage(`女巫提示：昨夜被刀的是 ${witchKillHint.targetName}。`)
          return
        }

        if (title === 'WOLF_RESELECT' && summary) {
          setInfoMessage(summary)
          return
        }

        if (title === 'HELP' && summary) {
          setRemoteHelpSummary(summary)
        }
        return
      }

      if (serverEvent.event === SERVER_WS_EVENTS.gameDayReveal) {
        setDayDeaths(parseDeaths(payload))
        return
      }

      if (serverEvent.event === SERVER_WS_EVENTS.gameVoteResult) {
        const nextVoteResult = parseVoteResult(payload)

        if (nextVoteResult) {
          setVoteResult(nextVoteResult)
        }
        return
      }

      if (serverEvent.event === SERVER_WS_EVENTS.gamePhaseTimer) {
        const scope = readString(payload.scope)
        const deadlineAt = readNumber(payload.deadlineAt)

        if (scope !== 'VOTE' || deadlineAt === null) {
          return
        }

        clearVoteCountdownTimer()
        const updateCountdown = () => {
          const remain = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000))
          setVoteCountdownSec(remain)

          if (remain <= 0) {
            clearVoteCountdownTimer()
          }
        }

        updateCountdown()
        voteCountdownTimerRef.current = window.setInterval(updateCountdown, 250)
        return
      }

      if (serverEvent.event === SERVER_WS_EVENTS.gameOver) {
        const nextGameOverInfo = parseGameOverInfo(payload)

        if (nextGameOverInfo) {
          setGameOverInfo(nextGameOverInfo)
        }
        return
      }

      if (serverEvent.event === SERVER_WS_EVENTS.gamePhaseChange) {
        const receivedEvent = readString(payload.receivedEvent)

        if (receivedEvent === CLIENT_WS_EVENTS.gameStart) {
          setWitchOptions(null)
          setSeerChecks([])
          setWolfVoteHints([])
          setWitchKillHints([])
          setRevoteCandidates([])
          setPendingSeerResult(null)
          setPendingWitchKillHint(null)
          setDayDeaths([])
          setVoteResult(null)
          setVoteCountdownSec(null)
          setGameOverInfo(null)
        }

        if (receivedEvent) {
          setInfoMessage(`已提交动作：${receivedEvent}`)
        }

        const phase = readString(payload.phase)

        if (phase === 'DAY_PK_SPEECH' || phase === 'DAY_REVOTE') {
          setRevoteCandidates(parseRevoteCandidates(payload))
        } else {
          setRevoteCandidates([])
        }
        return
      }

      if (serverEvent.event === SERVER_WS_EVENTS.gameError) {
        const code = readString(payload.code) ?? 'UNKNOWN'
        const message = readString(payload.message) ?? 'Unknown error'

        if (code === 'UNAUTHORIZED') {
          resetSessionScopedState()
          setConnectionStatus('IDLE')
          setInfoMessage('会话失效，请重新加入房间。')
        }

        setErrorMessage(`[${code}] ${message}`)
      }
    },
    [clearVoteCountdownTimer, resetSessionScopedState]
  )

  const connectSocket = useCallback(
    (sessionToken: string) => {
      if (!enabled) {
        return
      }

      clearReconnectTimer()
      disposeSocket()
      setConnectionStatus('CONNECTING')

      const wsUrl = `${wsBaseUrl}/ws?sessionToken=${encodeURIComponent(
        sessionToken
      )}`
      const nextSocket = new WebSocket(wsUrl)
      socketRef.current = nextSocket

      nextSocket.onopen = () => {
        setConnectionStatus('CONNECTED')
        setDisconnectCountdownSec(DISCONNECT_COUNTDOWN_SEC)
        clearCountdownTimer()
        setInfoMessage('实时连接已建立。')
      }

      nextSocket.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          return
        }

        const parsedEvent = parseServerEvent(event.data)

        if (!parsedEvent) {
          setErrorMessage('收到无法解析的服务端消息。')
          return
        }

        handleServerEvent(parsedEvent)
      }

      nextSocket.onclose = () => {
        setConnectionStatus('DISCONNECTED')
        setInfoMessage('连接中断，正在尝试重连...')
      }

      nextSocket.onerror = () => {
        setErrorMessage('WebSocket 连接异常。')
      }
    },
    [
      clearCountdownTimer,
      clearReconnectTimer,
      disposeSocket,
      enabled,
      handleServerEvent,
      wsBaseUrl
    ]
  )

  const sendEvent = useCallback(
    (event: ClientWsEvent, payload: Record<string, unknown>) => {
      const socket = socketRef.current

      if (!socket || socket.readyState !== WS_OPEN_STATE) {
        setErrorMessage('连接未就绪，暂时无法提交操作。')
        return
      }

      socket.send(
        JSON.stringify({
          event,
          requestId: `req_${Date.now()}`,
          payload
        })
      )
    },
    []
  )

  const joinGame = useCallback(
    async (nickname: string) => {
      if (!enabled) {
        return
      }

      const normalizedNickname = nickname.trim()

      if (!normalizedNickname) {
        setErrorMessage('请输入昵称后再加入。')
        return
      }

      setConnectionStatus('JOINING')
      setErrorMessage(null)
      setInfoMessage(null)

      try {
        const response = await fetch(`${httpBaseUrl}/api/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nickname: normalizedNickname
          })
        })

        const result = (await response.json()) as ApiResponse<JoinResponse>

        if (!result.ok) {
          setConnectionStatus('IDLE')

          if (result.error.code === 'GAME_ALREADY_STARTED') {
            setJoinRejectedByRunning(true)
          }

          setErrorMessage(result.error.message)
          return
        }

        setSession(result.data)
        setJoinRejectedByRunning(false)
        setSeerChecks([])
        setWolfVoteHints([])
        setWitchKillHints([])
        setRevoteCandidates([])
        setPendingSeerResult(null)
        setPendingWitchKillHint(null)
        setDayDeaths([])
        setVoteResult(null)
        setGameOverInfo(null)
        setPendingDisconnects([])
        connectSocket(result.data.sessionToken)
      } catch {
        setConnectionStatus('IDLE')
        setErrorMessage('加入房间失败，请检查服务端地址。')
      }
    },
    [connectSocket, enabled, httpBaseUrl]
  )

  const manualReconnect = useCallback(() => {
    if (!enabled || !session) {
      return
    }

    connectSocket(session.sessionToken)
  }, [connectSocket, enabled, session])

  const requestHelp = useCallback(() => {
    sendEvent(CLIENT_WS_EVENTS.uiRequestHelp, {})
  }, [sendEvent])

  const startGame = useCallback(() => {
    sendEvent(CLIENT_WS_EVENTS.gameStart, {})
  }, [sendEvent])

  const confirmRoleView = useCallback(() => {
    sendEvent(CLIENT_WS_EVENTS.playerConfirmRole, {})
  }, [sendEvent])

  const advancePhase = useCallback(() => {
    sendEvent(CLIENT_WS_EVENTS.playerConfirmRole, {})
  }, [sendEvent])

  const submitWolfKill = useCallback(
    (targetId: string) => {
      sendEvent(CLIENT_WS_EVENTS.nightSubmitKill, { targetId })
    },
    [sendEvent]
  )

  const submitSeerCheck = useCallback(
    (targetId: string) => {
      sendEvent(CLIENT_WS_EVENTS.nightSubmitSeer, { targetId })
    },
    [sendEvent]
  )

  const submitGuardProtect = useCallback(
    (targetId: string) => {
      sendEvent(CLIENT_WS_EVENTS.nightSubmitGuard, { targetId })
    },
    [sendEvent]
  )

  const submitWitchAction = useCallback(
    (action: 'save' | 'poison' | 'skip', targetId?: string) => {
      const payload: Record<string, unknown> = { action }

      if (targetId) {
        payload.targetId = targetId
      }

      sendEvent(CLIENT_WS_EVENTS.nightSubmitWitch, payload)
    },
    [sendEvent]
  )

  const submitDayVote = useCallback(
    (targetId: string | 'abstain') => {
      sendEvent(CLIENT_WS_EVENTS.daySubmitVote, { targetId })
    },
    [sendEvent]
  )

  const submitHunterShot = useCallback(
    (targetId: string | null) => {
      const payload = targetId ? { targetId } : {}
      sendEvent(CLIENT_WS_EVENTS.daySubmitHunter, payload)
    },
    [sendEvent]
  )

  useEffect(() => {
    persistSession(session)
  }, [session])

  useEffect(() => {
    if (enabled) {
      return
    }

    clearReconnectTimer()
    clearCountdownTimer()
    clearVoteCountdownTimer()
    disposeSocket()
  }, [
    clearCountdownTimer,
    clearReconnectTimer,
    clearVoteCountdownTimer,
    disposeSocket,
    enabled
  ])

  useEffect(() => {
    if (!enabled || connectionStatus !== 'DISCONNECTED') {
      clearCountdownTimer()
      return
    }

    clearCountdownTimer()
    countdownTimerRef.current = window.setInterval(() => {
      setDisconnectCountdownSec((current) => Math.max(0, current - 1))
    }, 1000)

    return () => {
      clearCountdownTimer()
    }
  }, [clearCountdownTimer, connectionStatus, enabled])

  useEffect(() => {
    if (!enabled || connectionStatus !== 'IDLE' || !session) {
      return
    }

    const timer = window.setTimeout(() => {
      connectSocket(session.sessionToken)
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [connectionStatus, connectSocket, enabled, session])

  useEffect(() => {
    if (snapshot?.phase === 'NIGHT_WOLF') {
      return
    }

    setWolfVoteHints([])
  }, [snapshot?.phase])

  useEffect(() => {
    if (snapshot?.phase === 'NIGHT_WITCH') {
      return
    }

    setWitchOptions(null)
  }, [snapshot?.phase])

  useEffect(() => {
    if (snapshot?.phase === 'DAY_PK_SPEECH' || snapshot?.phase === 'DAY_REVOTE') {
      return
    }

    setRevoteCandidates([])
  }, [snapshot?.phase])

  useEffect(() => {
    if (snapshot?.phase === 'DAY_VOTE' || snapshot?.phase === 'DAY_REVOTE') {
      return
    }

    clearVoteCountdownTimer()
    setVoteCountdownSec(null)
  }, [clearVoteCountdownTimer, snapshot?.phase])

  useEffect(() => {
    if (!enabled || connectionStatus !== 'DISCONNECTED' || !session) {
      clearReconnectTimer()
      return
    }

    clearReconnectTimer()
    reconnectTimerRef.current = window.setTimeout(() => {
      connectSocket(session.sessionToken)
    }, RECONNECT_DELAY_MS)

    return () => {
      clearReconnectTimer()
    }
  }, [clearReconnectTimer, connectSocket, connectionStatus, enabled, session])

  useEffect(() => {
    return () => {
      clearReconnectTimer()
      clearCountdownTimer()
      clearVoteCountdownTimer()
      disposeSocket()
    }
  }, [clearCountdownTimer, clearReconnectTimer, clearVoteCountdownTimer, disposeSocket])

  const currentView: MainView = useMemo(() => {
    return resolveMainView({
      sessionExists: session !== null,
      joinRejectedByRunning,
      connectionStatus,
      snapshot
    })
  }, [connectionStatus, joinRejectedByRunning, session, snapshot])

  return {
    runtimeMode: 'REALTIME' as const,
    httpBaseUrl,
    wsBaseUrl,
    connectionStatus,
    session,
    snapshot,
    roleInfo,
    witchOptions,
    seerChecks,
    wolfVoteHints,
    witchKillHints,
    revoteCandidates,
    pendingSeerResult,
    pendingWitchKillHint,
    dayDeaths,
    voteResult,
    voteCountdownSec,
    gameOverInfo,
    pendingDisconnects,
    disconnectCountdownSec,
    errorMessage,
    infoMessage,
    remoteHelpSummary,
    currentView,
    clearErrorMessage,
    dismissSeerResult,
    dismissWitchKillHint,
    joinGame,
    manualReconnect,
    requestHelp,
    startGame,
    confirmRoleView,
    advancePhase,
    submitWolfKill,
    submitSeerCheck,
    submitGuardProtect,
    submitWitchAction,
    submitDayVote,
    submitHunterShot
  }
}
