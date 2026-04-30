import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { resolveMockRolePreference } from '../lib/mock-mode'
import { resolveMainView } from '../lib/phase-view'
import type { JoinResponse } from '../shared/types/api-contract'
import type {
  ConnectionStatus,
  DayDeath,
  DisconnectNotice,
  GameOverInfo,
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

const MOCK_ROOM_ID = 'room_mock'
const MOCK_SESSION_TOKEN = 'mock-session-token'
const MOCK_BOT_NAMES = ['阿木', '白泽', '初夏', '冬青', '飞鸟', '海盐', '林雾']

const ROLE_DESCRIPTIONS: Record<string, string> = {
  VILLAGER: '平民：无主动技能，通过发言找出狼人。',
  WOLF: '狼人：每晚可刀杀一名玩家。',
  SEER: '预言家：每晚可查验一名玩家身份。',
  WITCH: '女巫：拥有一瓶解药和一瓶毒药。',
  HUNTER: '猎人：死亡时可开枪带走一名玩家。',
  GUARD: '守卫：每晚可守护一人，不能连续守同一人。',
  IDIOT: '白痴：被放逐可翻牌存活并失去投票权。'
}

type WitchAction = 'save' | 'poison' | 'skip'

const isAlivePlayer = (player: PlayerPublicSnapshot): boolean => {
  return player.alive
}

const clonePlayers = (players: PlayerPublicSnapshot[]): PlayerPublicSnapshot[] => {
  return players.map((player) => ({ ...player }))
}

const updatePlayerAlive = (
  players: PlayerPublicSnapshot[],
  playerId: string,
  alive: boolean
): PlayerPublicSnapshot[] => {
  return players.map((player) => {
    if (player.id !== playerId) {
      return player
    }

    return {
      ...player,
      alive
    }
  })
}

const toRoleInfo = (role: string): RoleInfo => {
  return {
    role,
    description: ROLE_DESCRIPTIONS[role] ?? '角色说明未配置。'
  }
}

const nextNightPhase = (phase: string): string => {
  if (phase === 'NIGHT_WOLF') {
    return 'NIGHT_SEER'
  }

  if (phase === 'NIGHT_SEER') {
    return 'NIGHT_GUARD'
  }

  if (phase === 'NIGHT_GUARD') {
    return 'NIGHT_WITCH'
  }

  return 'DAY_REVEAL'
}

const inferMockAlignment = (targetId: string): 'GOOD' | 'WOLF' => {
  const sum = targetId.split('').reduce((total, character) => {
    return total + character.charCodeAt(0)
  }, 0)

  return sum % 3 === 0 ? 'WOLF' : 'GOOD'
}

export const useMockGameClient = () => {
  const mockRole = useMemo(() => resolveMockRolePreference(), [])

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('IDLE')
  const [session, setSession] = useState<JoinResponse | null>(null)
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null)
  const [roleInfo, setRoleInfo] = useState<RoleInfo | null>(null)
  const [seerChecks, setSeerChecks] = useState<SeerCheckRecord[]>([])
  const [wolfVoteHints, setWolfVoteHints] = useState<WolfVoteHint[]>([])
  const [witchKillHints, setWitchKillHints] = useState<WitchKillHintRecord[]>([])
  const [revoteCandidates] = useState<RevoteCandidate[]>([])
  const [witchOptions] = useState<WitchOptions | null>(null)
  const [pendingSeerResult, setPendingSeerResult] =
    useState<SeerCheckRecord | null>(null)
  const [pendingWitchKillHint, setPendingWitchKillHint] =
    useState<WitchKillHintRecord | null>(null)
  const [dayDeaths, setDayDeaths] = useState<DayDeath[]>([])
  const [voteResult, setVoteResult] = useState<VoteResultInfo | null>(null)
  const [voteCountdownSec] = useState<number | null>(null)
  const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null)
  const [pendingDisconnects, setPendingDisconnects] = useState<
    DisconnectNotice[]
  >([])
  const [disconnectCountdownSec] = useState(120)
  const [remoteHelpSummary, setRemoteHelpSummary] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [joinRejectedByRunning] = useState(false)
  const [dayRound, setDayRound] = useState(1)

  const wolfTargetRef = useRef<string | null>(null)

  const clearErrorMessage = useCallback(() => {
    setErrorMessage(null)
  }, [])

  const dismissSeerResult = useCallback(() => {
    setPendingSeerResult(null)
  }, [])

  const dismissWitchKillHint = useCallback(() => {
    setPendingWitchKillHint(null)
  }, [])

  const safeSetPhase = useCallback((phase: string) => {
    setSnapshot((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        phase
      }
    })
  }, [])

  const publishMockWitchKillHint = useCallback(() => {
    if (!wolfTargetRef.current || !snapshot) {
      return
    }

    const target = snapshot.players.find((player) => player.id === wolfTargetRef.current)

    if (!target) {
      return
    }

    const nextHint: WitchKillHintRecord = {
      targetId: target.id,
      targetName: target.nickname,
      round: dayRound,
      receivedAt: Date.now()
    }

    setWitchKillHints((current) => {
      const withoutCurrentRound = current.filter((item) => item.round !== nextHint.round)
      return [nextHint, ...withoutCurrentRound]
    })
    setPendingWitchKillHint(nextHint)
    setInfoMessage(`女巫提示：昨夜被刀的是 ${target.nickname}。`)
  }, [dayRound, snapshot])

  const setEndGame = useCallback(
    (winner: 'GOOD' | 'WOLF', reason: string) => {
      setSnapshot((current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          status: 'ENDED',
          phase: 'ENDED'
        }
      })

      setGameOverInfo((current) => {
        return {
          winner,
          reason,
          roles:
            current?.roles ??
            (snapshot?.players ?? []).map((player, index) => {
              const roles = ['WOLF', 'SEER', 'WITCH', 'HUNTER', 'GUARD', 'VILLAGER', 'IDIOT']

              return {
                playerId: player.id,
                role: roles[index % roles.length]
              }
            })
        }
      })
    },
    [snapshot?.players]
  )

  const autoAdvanceNight = useCallback(() => {
    setSnapshot((current) => {
      if (!current || current.status !== 'RUNNING') {
        return current
      }

      if (current.phase === 'NIGHT_WOLF') {
        const aliveTargets = current.players.filter((player) => {
          return player.alive && player.id !== session?.playerId
        })
        wolfTargetRef.current = aliveTargets[0]?.id ?? null
      }

      if (current.phase === 'NIGHT_WITCH') {
        const nextDeaths: DayDeath[] = []

        if (wolfTargetRef.current) {
          nextDeaths.push({
            playerId: wolfTargetRef.current,
            cause: 'WOLF_KILL'
          })
        }

        setDayDeaths(nextDeaths)
        setVoteResult(null)
        return {
          ...current,
          phase: 'DAY_REVEAL'
        }
      }

      if (current.phase === 'NIGHT_GUARD' && wolfTargetRef.current) {
        const target = current.players.find((player) => player.id === wolfTargetRef.current)

        if (target) {
          const nextHint: WitchKillHintRecord = {
            targetId: target.id,
            targetName: target.nickname,
            round: dayRound,
            receivedAt: Date.now()
          }

          setWitchKillHints((hints) => {
            const withoutCurrentRound = hints.filter((item) => item.round !== nextHint.round)
            return [nextHint, ...withoutCurrentRound]
          })
          setPendingWitchKillHint(nextHint)
          setInfoMessage(`女巫提示：昨夜被刀的是 ${target.nickname}。`)
        }
      }

      return {
        ...current,
        phase: nextNightPhase(current.phase)
      }
    })
  }, [dayRound, session?.playerId])

  const autoAdvanceHunterPhase = useCallback(() => {
    setSnapshot((current) => {
      if (!current) {
        return current
      }

      if (current.phase === 'DAY_HUNTER_NIGHT') {
        return {
          ...current,
          phase: 'DAY_LAST_WORDS'
        }
      }

      if (current.phase === 'DAY_HUNTER_VOTE') {
        return {
          ...current,
          phase: 'DAY_VOTE_RESULT'
        }
      }

      return current
    })
  }, [])

  useEffect(() => {
    if (!snapshot || snapshot.status !== 'RUNNING' || !roleInfo) {
      return
    }

    const nightRoleByPhase: Record<string, string> = {
      NIGHT_WOLF: 'WOLF',
      NIGHT_SEER: 'SEER',
      NIGHT_GUARD: 'GUARD',
      NIGHT_WITCH: 'WITCH'
    }

    const expectedRole = nightRoleByPhase[snapshot.phase]

    if (expectedRole && expectedRole !== roleInfo.role) {
      const timer = window.setTimeout(() => {
        autoAdvanceNight()
      }, 650)

      return () => {
        window.clearTimeout(timer)
      }
    }

    if (
      (snapshot.phase === 'DAY_HUNTER_NIGHT' || snapshot.phase === 'DAY_HUNTER_VOTE') &&
      roleInfo.role !== 'HUNTER'
    ) {
      const timer = window.setTimeout(() => {
        autoAdvanceHunterPhase()
      }, 650)

      return () => {
        window.clearTimeout(timer)
      }
    }
  }, [autoAdvanceHunterPhase, autoAdvanceNight, roleInfo, snapshot])

  useEffect(() => {
    if (snapshot?.phase === 'NIGHT_WOLF') {
      return
    }

    setWolfVoteHints([])
  }, [snapshot?.phase])

  const joinGame = useCallback(
    async (nickname: string) => {
      const normalizedNickname = nickname.trim()

      if (!normalizedNickname) {
        setErrorMessage('请输入昵称后再加入。')
        return
      }

      setConnectionStatus('JOINING')
      setErrorMessage(null)
      setInfoMessage(null)

      const players: PlayerPublicSnapshot[] = [
        {
          id: 'p_mock_1',
          nickname: normalizedNickname,
          avatarId: 'avatar_01',
          seatNo: 1,
          isHost: true,
          alive: true
        }
      ]

      for (let index = 0; index < 6; index += 1) {
        players.push({
          id: `p_mock_${index + 2}`,
          nickname: MOCK_BOT_NAMES[index] ?? `玩家${index + 2}`,
          avatarId: `avatar_0${(index % 9) + 1}`,
          seatNo: index + 2,
          isHost: false,
          alive: true
        })
      }

      const nextSession: JoinResponse = {
        roomId: MOCK_ROOM_ID,
        playerId: 'p_mock_1',
        sessionToken: MOCK_SESSION_TOKEN,
        isHost: true
      }

      setSession(nextSession)
      setSnapshot({
        roomId: MOCK_ROOM_ID,
        status: 'WAITING',
        phase: 'WAITING',
        players
      })
      setRoleInfo(null)
      setSeerChecks([])
      setWolfVoteHints([])
      setWitchKillHints([])
      setPendingSeerResult(null)
      setPendingWitchKillHint(null)
      setDayDeaths([])
      setVoteResult(null)
      setGameOverInfo(null)
      setPendingDisconnects([])
      setConnectionStatus('CONNECTED')
      setDayRound(1)
      wolfTargetRef.current = null
      setInfoMessage('Mock 模式已启用：无需后端即可演示页面。')
    },
    []
  )

  const manualReconnect = useCallback(() => {
    setConnectionStatus('CONNECTED')
    setInfoMessage('Mock 模式：连接状态已恢复。')
    setPendingDisconnects([])
  }, [])

  const requestHelp = useCallback(() => {
    setRemoteHelpSummary('Mock 模式：当前为本地演示流程，动作不会写入后端。')
  }, [])

  const startGame = useCallback(() => {
    setSnapshot((current) => {
      if (!current) {
        return current
      }

      if (current.players.length < 6 || current.players.length > 12) {
        setErrorMessage('标准模式仅支持 6-12 人开局。')
        return current
      }

      return {
        ...current,
        status: 'RUNNING',
        phase: 'ROLE_VIEW'
      }
    })
    setRoleInfo(toRoleInfo(mockRole))
    setSeerChecks([])
    setWolfVoteHints([])
    setWitchKillHints([])
    setPendingSeerResult(null)
    setPendingWitchKillHint(null)
    setVoteResult(null)
    setDayDeaths([])
    setDayRound(1)
    wolfTargetRef.current = null
    setInfoMessage('Mock 模式：已开始游戏。')
  }, [mockRole])

  const confirmRoleView = useCallback(() => {
    safeSetPhase('NIGHT_WOLF')
    setInfoMessage('Mock 模式：已确认身份，进入夜晚。')
  }, [safeSetPhase])

  const advancePhase = useCallback(() => {
    setSnapshot((current) => {
      if (!current) {
        return current
      }

      if (current.phase === 'DAY_REVEAL') {
        return { ...current, phase: 'DAY_LAST_WORDS' }
      }

      if (current.phase === 'DAY_LAST_WORDS') {
        return { ...current, phase: 'DAY_DISCUSSION' }
      }

      if (current.phase === 'DAY_DISCUSSION') {
        return { ...current, phase: 'DAY_VOTE' }
      }

      if (current.phase === 'DAY_VOTE_RESULT' || current.phase === 'DAY_IDIOT_REVEAL') {
        if (dayRound >= 2) {
          window.setTimeout(() => {
            setEndGame('GOOD', 'MOCK_TWO_ROUNDS_COMPLETED')
          }, 10)
          return current
        }

        setDayRound((value) => value + 1)
        wolfTargetRef.current = null
        setDayDeaths([])
        setVoteResult(null)

        return { ...current, phase: 'NIGHT_WOLF' }
      }

      return current
    })
  }, [dayRound, setEndGame])

  const submitWolfKill = useCallback(
    (targetId: string) => {
      const selfWolf = snapshot?.players.find((player) => player.id === session?.playerId)
      const target = snapshot?.players.find((player) => player.id === targetId)

      if (selfWolf && target) {
        setWolfVoteHints([
          {
            wolfId: selfWolf.id,
            wolfName: selfWolf.nickname,
            targetId: target.id,
            targetName: target.nickname
          }
        ])
      }

      wolfTargetRef.current = targetId
      safeSetPhase('NIGHT_SEER')
      setInfoMessage('Mock 模式：狼人已提交刀人。')
    },
    [safeSetPhase, session?.playerId, snapshot?.players]
  )

  const submitSeerCheck = useCallback(
    (targetId: string) => {
      const targetPlayer = snapshot?.players.find((player) => player.id === targetId)
      const seerResult: SeerCheckRecord = {
        targetId,
        targetName: targetPlayer?.nickname ?? targetId,
        alignment: inferMockAlignment(targetId),
        round: dayRound,
        checkedAt: Date.now()
      }

      setSeerChecks((current) => [seerResult, ...current])
      setPendingSeerResult(seerResult)
      safeSetPhase('NIGHT_GUARD')
      setInfoMessage(
        `Mock 模式：预言家查验 ${seerResult.targetName} 为 ${
          seerResult.alignment === 'WOLF' ? '狼人' : '好人'
        }。`
      )
    },
    [dayRound, safeSetPhase, snapshot?.players]
  )

  const submitGuardProtect = useCallback(
    (_targetId: string) => {
      safeSetPhase('NIGHT_WITCH')
      publishMockWitchKillHint()
    },
    [publishMockWitchKillHint, safeSetPhase]
  )

  const submitWitchAction = useCallback(
    (action: WitchAction, targetId?: string) => {
      const nextDeaths: DayDeath[] = []

      if (action !== 'save' && wolfTargetRef.current) {
        nextDeaths.push({
          playerId: wolfTargetRef.current,
          cause: 'WOLF_KILL'
        })
      }

      if (action === 'poison' && targetId) {
        nextDeaths.push({
          playerId: targetId,
          cause: 'WITCH_POISON'
        })
      }

      setDayDeaths(nextDeaths)
      setVoteResult(null)
      safeSetPhase('DAY_REVEAL')
      setInfoMessage('Mock 模式：女巫操作完成，进入白天。')
    },
    [safeSetPhase]
  )

  const submitDayVote = useCallback(
    (targetId: string | 'abstain') => {
      setSnapshot((current) => {
        if (!current) {
          return current
        }

        let players = clonePlayers(current.players)

        if (targetId !== 'abstain') {
          players = updatePlayerAlive(players, targetId, false)
        }

        return {
          ...current,
          players,
          phase: 'DAY_VOTE_RESULT'
        }
      })

      setVoteResult({
        eliminatedId: targetId === 'abstain' ? null : targetId,
        eliminatedName:
          targetId === 'abstain'
            ? null
            : snapshot?.players.find((player) => player.id === targetId)?.nickname ?? null,
        isTie: targetId === 'abstain',
        roundNo: 1,
        ballots: session
          ? [
              {
                voterId: session.playerId,
                voterName:
                  snapshot?.players.find((player) => player.id === session.playerId)
                    ?.nickname ?? '你',
                targetId: targetId === 'abstain' ? null : targetId,
                targetName:
                  targetId === 'abstain'
                    ? null
                    : snapshot?.players.find((player) => player.id === targetId)?.nickname ??
                      null
              }
            ]
          : []
      })
      setInfoMessage('Mock 模式：投票已提交。')
    },
    [session, snapshot?.players]
  )

  const submitHunterShot = useCallback((targetId: string | null) => {
    if (targetId) {
      setSnapshot((current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          players: updatePlayerAlive(current.players, targetId, false),
          phase: 'DAY_VOTE_RESULT'
        }
      })
    } else {
      safeSetPhase('DAY_VOTE_RESULT')
    }

    setInfoMessage('Mock 模式：猎人技能已处理。')
  }, [safeSetPhase])

  const currentView: MainView = useMemo(() => {
    return resolveMainView({
      sessionExists: session !== null,
      joinRejectedByRunning,
      connectionStatus,
      snapshot
    })
  }, [connectionStatus, joinRejectedByRunning, session, snapshot])

  const alivePlayers = snapshot?.players.filter(isAlivePlayer).length ?? 0

  useEffect(() => {
    if (!snapshot || snapshot.status !== 'RUNNING') {
      return
    }

    if (alivePlayers <= 3) {
      const timer = window.setTimeout(() => {
        setEndGame('GOOD', 'MOCK_VICTORY_CHECK')
      }, 300)

      return () => {
        window.clearTimeout(timer)
      }
    }
  }, [alivePlayers, setEndGame, snapshot])

  return {
    runtimeMode: 'MOCK' as const,
    httpBaseUrl: 'mock://local',
    wsBaseUrl: 'mock://local',
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
