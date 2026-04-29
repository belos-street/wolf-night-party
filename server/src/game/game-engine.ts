import type {
  DeathCause,
  PlayerState,
  RoleKind,
  Team
} from '../shared/types/domain-models.js'
import {
  GAME_STATUS,
  PLAYER_COUNT_LIMITS
} from '../shared/constants/game-constants.js'
import { GAME_PHASES, type GamePhase } from './constants/game-phases.js'
import { buildRoleDeckByPreset, getStandardPreset } from './standard-presets.js'
import type { InternalRoomState } from './types/game-state.js'

const SPECIAL_ROLES: RoleKind[] = ['SEER', 'WITCH', 'HUNTER', 'GUARD', 'IDIOT']

const ROLE_DESCRIPTIONS: Record<RoleKind, string> = {
  VILLAGER: '平民：无主动技能，通过发言找出狼人。',
  WOLF: '狼人：每晚可刀杀一名玩家。',
  SEER: '预言家：每晚可查验一名玩家身份。',
  WITCH: '女巫：拥有一瓶解药和一瓶毒药。',
  HUNTER: '猎人：死亡时可开枪带走一名玩家。',
  GUARD: '守卫：每晚可守护一人，不能连续守同一人。',
  IDIOT: '白痴：被投票放逐可翻牌存活并失去投票权。'
}

const resolveTeamByRole = (role: RoleKind): Team => {
  return role === 'WOLF' ? 'WOLF' : 'GOOD'
}

const updateTimestamp = (state: InternalRoomState) => {
  state.updatedAt = Date.now()
}

const setPhase = (state: InternalRoomState, phase: GamePhase) => {
  state.phase = phase
  updateTimestamp(state)
}

const getAlivePlayers = (state: InternalRoomState): PlayerState[] => {
  return state.players.filter((player) => player.alive)
}

const getAlivePlayersByRole = (
  state: InternalRoomState,
  role: RoleKind
): PlayerState[] => {
  return state.players.filter((player) => player.alive && player.role === role)
}

const getPlayerById = (
  state: InternalRoomState,
  playerId: string
): PlayerState => {
  const player = state.players.find((item) => item.id === playerId)

  if (!player) {
    throw new Error('PLAYER_NOT_FOUND')
  }

  return player
}

const validateAlivePlayer = (
  state: InternalRoomState,
  playerId: string
): PlayerState => {
  const player = getPlayerById(state, playerId)

  if (!player.alive) {
    throw new Error('PLAYER_DEAD')
  }

  return player
}

const shuffleRoles = (
  roleDeck: RoleKind[],
  randomFn: () => number
): RoleKind[] => {
  const shuffled = [...roleDeck]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomFn() * (index + 1))
    const temp = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = temp
  }

  return shuffled
}

const ensureGameNotEnded = (state: InternalRoomState) => {
  if (state.status === GAME_STATUS.ended) {
    throw new Error('GAME_ENDED')
  }
}

const killPlayer = (
  state: InternalRoomState,
  playerId: string,
  cause: DeathCause,
  atPhase: GamePhase,
  canLastWords: boolean
) => {
  const player = validateAlivePlayer(state, playerId)

  player.alive = false

  state.deadPlayers.push({
    playerId,
    cause,
    atPhase,
    canLastWords,
    revealedRole: player.role
  })
}

const checkVictory = (state: InternalRoomState): boolean => {
  const alivePlayers = getAlivePlayers(state)
  const aliveWolves = alivePlayers.filter(
    (player) => player.role === 'WOLF'
  ).length

  if (aliveWolves === 0) {
    state.status = GAME_STATUS.ended
    state.gameResult = {
      winner: 'GOOD',
      reason: 'ALL_WOLVES_ELIMINATED',
      endedAt: Date.now()
    }
    setPhase(state, GAME_PHASES.ended)
    return true
  }

  const aliveGoodPlayers = alivePlayers.length - aliveWolves

  if (
    state.config.victoryRule === 'MASSACRE' &&
    aliveWolves >= aliveGoodPlayers
  ) {
    state.status = GAME_STATUS.ended
    state.gameResult = {
      winner: 'WOLF',
      reason: 'MASSACRE_CONDITION_MET',
      endedAt: Date.now()
    }
    setPhase(state, GAME_PHASES.ended)
    return true
  }

  if (state.config.victoryRule === 'SIDE_KILL') {
    const aliveSpecialCount = alivePlayers.filter((player) =>
      SPECIAL_ROLES.includes(player.role)
    ).length
    const aliveVillagerCount = alivePlayers.filter(
      (player) => player.role === 'VILLAGER'
    ).length

    if (aliveSpecialCount === 0 || aliveVillagerCount === 0) {
      state.status = GAME_STATUS.ended
      state.gameResult = {
        winner: 'WOLF',
        reason: 'SIDE_KILL_CONDITION_MET',
        endedAt: Date.now()
      }
      setPhase(state, GAME_PHASES.ended)
      return true
    }
  }

  return false
}

const createNightActionState = () => {
  return {
    wolfVotes: {},
    seerTargetId: undefined,
    guardTargetId: undefined,
    witchAction: null,
    witchTargetId: undefined
  }
}

const getWolfTargetId = (state: InternalRoomState): string | undefined => {
  const voteState = state.nightActionState

  if (!voteState) {
    return undefined
  }

  const voteEntries = Object.values(voteState.wolfVotes)

  if (voteEntries.length === 0) {
    return undefined
  }

  const voteCounter = new Map<string, number>()

  voteEntries.forEach((targetId) => {
    voteCounter.set(targetId, (voteCounter.get(targetId) ?? 0) + 1)
  })

  let maxVotes = 0
  let candidateIds: string[] = []

  voteCounter.forEach((count, targetId) => {
    if (count > maxVotes) {
      maxVotes = count
      candidateIds = [targetId]
      return
    }

    if (count === maxVotes) {
      candidateIds.push(targetId)
    }
  })

  candidateIds.sort((left, right) => {
    const leftSeatNo = getPlayerById(state, left).seatNo
    const rightSeatNo = getPlayerById(state, right).seatNo

    return leftSeatNo - rightSeatNo
  })

  return candidateIds[0]
}

const startVoteRound = (
  state: InternalRoomState,
  roundNo: 1 | 2,
  candidates?: string[]
) => {
  const aliveVoters = state.players.filter(
    (player) => player.alive && player.canVote
  )
  const voteCandidates =
    candidates ??
    state.players.filter((player) => player.alive).map((player) => player.id)

  state.voteActionState = {
    roundNo,
    candidates: voteCandidates,
    ballots: {}
  }
  state.lastVoteBallots = null

  setPhase(state, roundNo === 1 ? GAME_PHASES.dayVote : GAME_PHASES.dayRevote)

  if (aliveVoters.length === 0) {
    finalizeVoteRound(state)
  }
}

const beginNightCycle = (state: InternalRoomState, isNextRound: boolean) => {
  if (isNextRound) {
    state.round += 1
  }

  state.nightActionState = createNightActionState()
  state.voteActionState = null
  state.hunterActionState = null
  state.lastVoteResult = null
  state.lastVoteBallots = null
  setPhase(state, GAME_PHASES.nightWolf)
}

const moveAfterWolfPhase = (state: InternalRoomState) => {
  setPhase(state, GAME_PHASES.nightSeer)

  if (getAlivePlayersByRole(state, 'SEER').length === 0) {
    moveAfterSeerPhase(state)
  }
}

const moveAfterSeerPhase = (state: InternalRoomState) => {
  setPhase(state, GAME_PHASES.nightGuard)

  if (getAlivePlayersByRole(state, 'GUARD').length === 0) {
    moveAfterGuardPhase(state)
  }
}

const moveAfterGuardPhase = (state: InternalRoomState) => {
  setPhase(state, GAME_PHASES.nightWitch)

  if (getAlivePlayersByRole(state, 'WITCH').length === 0) {
    resolveNight(state)
  }
}

const moveAfterNightHunterPhase = (state: InternalRoomState) => {
  setPhase(state, GAME_PHASES.dayLastWords)
}

const moveToNextNightFromDay = (state: InternalRoomState) => {
  if (!checkVictory(state)) {
    beginNightCycle(state, true)
  }
}

const handleVoteElimination = (
  state: InternalRoomState,
  targetId: string,
  roundNo: 1 | 2
) => {
  const target = validateAlivePlayer(state, targetId)
  state.lastVoteResult = {
    eliminatedId: target.id,
    isTie: false,
    roundNo
  }

  if (target.role === 'IDIOT') {
    target.canVote = false
    setPhase(state, GAME_PHASES.dayIdiotReveal)
    return
  }

  killPlayer(state, target.id, 'VOTE_OUT', state.phase, true)

  if (checkVictory(state)) {
    return
  }

  if (target.role === 'HUNTER') {
    state.hunterActionState = {
      source: 'VOTE',
      hunterId: target.id
    }
    setPhase(state, GAME_PHASES.dayHunterVote)
    return
  }

  setPhase(state, GAME_PHASES.dayVoteResult)
}

const finalizeVoteRound = (state: InternalRoomState) => {
  const voteState = state.voteActionState

  if (!voteState) {
    throw new Error('VOTE_NOT_STARTED')
  }

  const finalizedBallots = { ...voteState.ballots }

  const tally = new Map<string, number>()

  Object.values(voteState.ballots).forEach((targetId) => {
    if (targetId === 'abstain') {
      return
    }

    tally.set(targetId, (tally.get(targetId) ?? 0) + 1)
  })

  let maxVotes = 0
  let topCandidates: string[] = []

  tally.forEach((votes, targetId) => {
    if (votes > maxVotes) {
      maxVotes = votes
      topCandidates = [targetId]
      return
    }

    if (votes === maxVotes) {
      topCandidates.push(targetId)
    }
  })

  if (topCandidates.length !== 1) {
    if (voteState.roundNo === 1) {
      const revoteCandidates =
        topCandidates.length > 0
          ? topCandidates
          : voteState.candidates.filter((candidateId) => {
              return validateAlivePlayer(state, candidateId).alive
            })

      startVoteRound(state, 2, revoteCandidates)
      return
    }

    state.voteActionState = null
    state.lastVoteBallots = finalizedBallots
    state.lastVoteResult = {
      eliminatedId: null,
      isTie: true,
      roundNo: 2
    }
    setPhase(state, GAME_PHASES.dayVoteResult)
    return
  }

  state.voteActionState = null
  state.lastVoteBallots = finalizedBallots
  handleVoteElimination(state, topCandidates[0], voteState.roundNo)
}

const resolveNight = (state: InternalRoomState) => {
  const nightState = state.nightActionState

  if (!nightState) {
    throw new Error('NIGHT_ACTION_NOT_STARTED')
  }

  setPhase(state, GAME_PHASES.nightResolve)

  const deathMap = new Map<string, DeathCause>()
  const wolfTargetId = getWolfTargetId(state)
  const guardTargetId = nightState.guardTargetId

  if (wolfTargetId && wolfTargetId !== guardTargetId) {
    deathMap.set(wolfTargetId, 'WOLF_KILL')
  }

  if (
    nightState.witchAction === 'SAVE' &&
    wolfTargetId &&
    deathMap.has(wolfTargetId) &&
    state.witchState.saveAvailable
  ) {
    deathMap.delete(wolfTargetId)
    state.witchState.saveAvailable = false
  }

  if (
    nightState.witchAction === 'POISON' &&
    nightState.witchTargetId &&
    state.witchState.poisonAvailable
  ) {
    deathMap.set(nightState.witchTargetId, 'WITCH_POISON')
    state.witchState.poisonAvailable = false
  }

  state.nightActionState = null

  let hunterKilledByWolfId: string | null = null

  deathMap.forEach((cause, playerId) => {
    const target = validateAlivePlayer(state, playerId)
    const canLastWords = cause === 'WOLF_KILL'
    killPlayer(state, playerId, cause, GAME_PHASES.nightResolve, canLastWords)

    if (cause === 'WOLF_KILL' && target.role === 'HUNTER') {
      hunterKilledByWolfId = target.id
    }
  })

  if (checkVictory(state)) {
    return
  }

  setPhase(state, GAME_PHASES.dayReveal)

  if (hunterKilledByWolfId) {
    state.hunterActionState = {
      source: 'NIGHT',
      hunterId: hunterKilledByWolfId
    }
    setPhase(state, GAME_PHASES.dayHunterNight)
  }
}

const getDefaultWolfTargetId = (
  state: InternalRoomState
): string | undefined => {
  const aliveTargets = state.players
    .filter((player) => player.alive && player.role !== 'WOLF')
    .sort((left, right) => left.seatNo - right.seatNo)

  return aliveTargets[0]?.id
}

export const startGame = (
  state: InternalRoomState,
  hostPlayerId: string,
  randomFn: () => number = Math.random
) => {
  ensureGameNotEnded(state)

  if (state.status !== GAME_STATUS.waiting) {
    throw new Error('GAME_ALREADY_STARTED')
  }

  const hostPlayer = validateAlivePlayer(state, hostPlayerId)

  if (!hostPlayer.isHost) {
    throw new Error('HOST_ONLY_ACTION')
  }

  if (
    state.players.length < PLAYER_COUNT_LIMITS.min ||
    state.players.length > PLAYER_COUNT_LIMITS.max
  ) {
    throw new Error('INVALID_PLAYER_COUNT')
  }

  const preset = getStandardPreset(state.players.length)

  if (!preset) {
    throw new Error('PRESET_NOT_FOUND')
  }

  const roleDeck = buildRoleDeckByPreset(preset)
  const shuffledRoles = shuffleRoles(roleDeck, randomFn)

  state.players.forEach((player, index) => {
    const role = shuffledRoles[index]

    player.role = role
    player.team = resolveTeamByRole(role)
    player.canVote = true
    player.alive = true
  })

  state.config.playerCount = state.players.length
  state.config.victoryRule = preset.victoryRule
  state.config.presetId = preset.presetId
  state.status = GAME_STATUS.running
  state.round = 1
  state.deadPlayers = []
  state.roleViewConfirmedPlayerIds = []
  state.nightActionState = null
  state.voteActionState = null
  state.hunterActionState = null
  state.witchState = {
    saveAvailable: true,
    poisonAvailable: true
  }
  state.lastGuardTargetId = null
  state.lastVoteResult = null
  state.lastVoteBallots = null
  state.gameResult = null

  setPhase(state, GAME_PHASES.roleAssignment)
  setPhase(state, GAME_PHASES.roleView)
}

export const confirmRoleView = (state: InternalRoomState, playerId: string) => {
  ensureGameNotEnded(state)

  if (state.phase !== GAME_PHASES.roleView) {
    throw new Error('PHASE_MISMATCH')
  }

  const player = validateAlivePlayer(state, playerId)

  if (!state.roleViewConfirmedPlayerIds.includes(player.id)) {
    state.roleViewConfirmedPlayerIds.push(player.id)
  }

  const alivePlayers = getAlivePlayers(state)
  const allConfirmed = alivePlayers.every((alivePlayer) => {
    return state.roleViewConfirmedPlayerIds.includes(alivePlayer.id)
  })

  if (allConfirmed) {
    beginNightCycle(state, false)
  }
}

export const submitWolfKill = (
  state: InternalRoomState,
  playerId: string,
  targetId: string
) => {
  ensureGameNotEnded(state)

  if (state.phase !== GAME_PHASES.nightWolf || !state.nightActionState) {
    throw new Error('PHASE_MISMATCH')
  }

  const wolf = validateAlivePlayer(state, playerId)

  if (wolf.role !== 'WOLF') {
    throw new Error('NOT_YOUR_TURN')
  }

  validateAlivePlayer(state, targetId)

  state.nightActionState.wolfVotes[playerId] = targetId

  const aliveWolves = getAlivePlayersByRole(state, 'WOLF')
  const allWolvesSubmitted = aliveWolves.every((aliveWolf) => {
    return Boolean(state.nightActionState?.wolfVotes[aliveWolf.id])
  })

  if (allWolvesSubmitted) {
    const selectedTargetIds = Object.values(state.nightActionState.wolfVotes)
    const uniqueTargetCount = new Set(selectedTargetIds).size

    if (uniqueTargetCount > 1) {
      // Wolves voted for different targets, force a full re-selection for fairness.
      state.nightActionState.wolfVotes = {}
      return
    }

    moveAfterWolfPhase(state)
  }
}

export const submitSeerCheck = (
  state: InternalRoomState,
  playerId: string,
  targetId: string
) => {
  ensureGameNotEnded(state)

  if (state.phase !== GAME_PHASES.nightSeer || !state.nightActionState) {
    throw new Error('PHASE_MISMATCH')
  }

  const seer = validateAlivePlayer(state, playerId)

  if (seer.role !== 'SEER') {
    throw new Error('NOT_YOUR_TURN')
  }

  validateAlivePlayer(state, targetId)

  state.nightActionState.seerTargetId = targetId
  moveAfterSeerPhase(state)
}

export const submitGuardProtect = (
  state: InternalRoomState,
  playerId: string,
  targetId: string
) => {
  ensureGameNotEnded(state)

  if (state.phase !== GAME_PHASES.nightGuard || !state.nightActionState) {
    throw new Error('PHASE_MISMATCH')
  }

  const guard = validateAlivePlayer(state, playerId)

  if (guard.role !== 'GUARD') {
    throw new Error('NOT_YOUR_TURN')
  }

  if (state.lastGuardTargetId === targetId) {
    throw new Error('INVALID_TARGET')
  }

  validateAlivePlayer(state, targetId)

  state.nightActionState.guardTargetId = targetId
  state.lastGuardTargetId = targetId
  moveAfterGuardPhase(state)
}

export const submitWitchAction = (
  state: InternalRoomState,
  playerId: string,
  action: 'SAVE' | 'POISON' | 'SKIP',
  targetId?: string
) => {
  ensureGameNotEnded(state)

  if (state.phase !== GAME_PHASES.nightWitch || !state.nightActionState) {
    throw new Error('PHASE_MISMATCH')
  }

  const witch = validateAlivePlayer(state, playerId)

  if (witch.role !== 'WITCH') {
    throw new Error('NOT_YOUR_TURN')
  }

  const wolfTargetId = getWolfTargetId(state)

  if (action === 'SAVE') {
    if (!state.witchState.saveAvailable || !wolfTargetId) {
      throw new Error('INVALID_ACTION')
    }

    const isSelfSave = wolfTargetId === witch.id

    if (isSelfSave && state.round > 1) {
      throw new Error('INVALID_ACTION')
    }
  }

  if (action === 'POISON') {
    if (!state.witchState.poisonAvailable || !targetId) {
      throw new Error('INVALID_ACTION')
    }

    validateAlivePlayer(state, targetId)
  }

  state.nightActionState.witchAction = action
  state.nightActionState.witchTargetId = targetId

  resolveNight(state)
}

export const advanceDayPhase = (state: InternalRoomState) => {
  ensureGameNotEnded(state)

  if (state.phase === GAME_PHASES.dayReveal) {
    if (state.hunterActionState?.source === 'NIGHT') {
      setPhase(state, GAME_PHASES.dayHunterNight)
      return
    }

    setPhase(state, GAME_PHASES.dayLastWords)
    return
  }

  if (state.phase === GAME_PHASES.dayLastWords) {
    setPhase(state, GAME_PHASES.dayDiscussion)
    return
  }

  if (state.phase === GAME_PHASES.dayDiscussion) {
    startVoteRound(state, 1)
    return
  }

  if (state.phase === GAME_PHASES.dayVoteResult) {
    moveToNextNightFromDay(state)
    return
  }

  if (state.phase === GAME_PHASES.dayIdiotReveal) {
    moveToNextNightFromDay(state)
    return
  }

  throw new Error('PHASE_MISMATCH')
}

export const submitDayVote = (
  state: InternalRoomState,
  playerId: string,
  targetId: string | 'abstain'
) => {
  ensureGameNotEnded(state)

  if (
    state.phase !== GAME_PHASES.dayVote &&
    state.phase !== GAME_PHASES.dayRevote
  ) {
    throw new Error('PHASE_MISMATCH')
  }

  const voter = validateAlivePlayer(state, playerId)

  if (!voter.canVote) {
    throw new Error('NOT_YOUR_TURN')
  }

  if (!state.voteActionState) {
    throw new Error('VOTE_NOT_STARTED')
  }

  if (state.voteActionState.ballots[playerId]) {
    throw new Error('ALREADY_SUBMITTED')
  }

  if (targetId !== 'abstain') {
    if (targetId === playerId) {
      throw new Error('INVALID_TARGET')
    }

    validateAlivePlayer(state, targetId)

    if (
      state.phase === GAME_PHASES.dayRevote &&
      !state.voteActionState.candidates.includes(targetId)
    ) {
      throw new Error('INVALID_TARGET')
    }
  }

  state.voteActionState.ballots[playerId] = targetId

  const aliveVoterIds = state.players
    .filter((player) => player.alive && player.canVote)
    .map((player) => player.id)

  const allSubmitted = aliveVoterIds.every((aliveVoterId) => {
    return Boolean(state.voteActionState?.ballots[aliveVoterId])
  })

  if (allSubmitted) {
    finalizeVoteRound(state)
  }
}

export const submitHunterShot = (
  state: InternalRoomState,
  hunterId: string,
  targetId: string | null
) => {
  ensureGameNotEnded(state)

  if (
    state.phase !== GAME_PHASES.dayHunterNight &&
    state.phase !== GAME_PHASES.dayHunterVote
  ) {
    throw new Error('PHASE_MISMATCH')
  }

  const hunterActionState = state.hunterActionState

  if (!hunterActionState || hunterActionState.hunterId !== hunterId) {
    throw new Error('NOT_YOUR_TURN')
  }

  if (targetId) {
    validateAlivePlayer(state, targetId)
    killPlayer(state, targetId, 'HUNTER_SHOT', state.phase, false)
  }

  state.hunterActionState = null

  if (checkVictory(state)) {
    return
  }

  if (state.phase === GAME_PHASES.dayHunterNight) {
    moveAfterNightHunterPhase(state)
    return
  }

  setPhase(state, GAME_PHASES.dayVoteResult)
}

export const applyPhaseTimeout = (state: InternalRoomState) => {
  ensureGameNotEnded(state)

  if (state.phase === GAME_PHASES.nightWolf) {
    if (state.nightActionState) {
      const defaultTargetId = getDefaultWolfTargetId(state)
      const aliveWolves = getAlivePlayersByRole(state, 'WOLF')

      if (defaultTargetId) {
        aliveWolves.forEach((wolf) => {
          state.nightActionState!.wolfVotes[wolf.id] = defaultTargetId
        })
      }
    }

    moveAfterWolfPhase(state)
    return
  }

  if (state.phase === GAME_PHASES.nightSeer) {
    moveAfterSeerPhase(state)
    return
  }

  if (state.phase === GAME_PHASES.nightGuard) {
    moveAfterGuardPhase(state)
    return
  }

  if (state.phase === GAME_PHASES.nightWitch) {
    if (state.nightActionState) {
      state.nightActionState.witchAction = 'SKIP'
      state.nightActionState.witchTargetId = undefined
    }

    resolveNight(state)
    return
  }

  if (
    state.phase === GAME_PHASES.dayVote ||
    state.phase === GAME_PHASES.dayRevote
  ) {
    if (!state.voteActionState) {
      throw new Error('VOTE_NOT_STARTED')
    }

    state.players
      .filter((player) => player.alive && player.canVote)
      .forEach((player) => {
        if (!state.voteActionState?.ballots[player.id]) {
          state.voteActionState!.ballots[player.id] = 'abstain'
        }
      })

    finalizeVoteRound(state)
    return
  }

  if (
    state.phase === GAME_PHASES.dayHunterNight ||
    state.phase === GAME_PHASES.dayHunterVote
  ) {
    const hunterId = state.hunterActionState?.hunterId

    if (hunterId) {
      submitHunterShot(state, hunterId, null)
    }
  }
}

export const getPrivateRoleInfo = (
  state: InternalRoomState,
  playerId: string
) => {
  const player = getPlayerById(state, playerId)

  return {
    role: player.role,
    description: ROLE_DESCRIPTIONS[player.role]
  }
}

export const evaluateVictory = (state: InternalRoomState): boolean => {
  return checkVictory(state)
}
