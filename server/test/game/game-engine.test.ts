import * as assert from 'node:assert'
import { beforeEach, test } from 'node:test'

import { GAME_PHASES } from '../../src/game/constants/game-phases.js'
import {
  advanceDayPhaseInRoom,
  applyPhaseTimeoutInRoom,
  confirmRoleViewBySessionToken,
  evaluateVictoryInRoom,
  getRoomState,
  joinRoom,
  resetRoomStore,
  startGameBySessionToken,
  submitDayVoteBySessionToken,
  submitGuardProtectBySessionToken,
  submitHunterShotBySessionToken,
  submitSeerCheckBySessionToken,
  submitWitchActionBySessionToken,
  submitWolfKillBySessionToken
} from '../../src/game/room-store.js'
import type { RoleKind } from '../../src/shared/types/domain-models.js'

interface JoinedPlayer {
  playerId: string
  sessionToken: string
  isHost: boolean
}

const createPlayers = (count: number): JoinedPlayer[] => {
  const joinedPlayers: JoinedPlayer[] = []

  for (let index = 0; index < count; index += 1) {
    const result = joinRoom(`player-${index + 1}`, `avatar_${index + 1}`)
    joinedPlayers.push({
      playerId: result.playerId,
      sessionToken: result.sessionToken,
      isHost: result.isHost
    })
  }

  return joinedPlayers
}

const createSessionMap = (
  joinedPlayers: JoinedPlayer[]
): Map<string, string> => {
  return new Map(
    joinedPlayers.map((joinedPlayer) => {
      return [joinedPlayer.playerId, joinedPlayer.sessionToken]
    })
  )
}

const confirmAllRoles = (joinedPlayers: JoinedPlayer[]) => {
  joinedPlayers.forEach((joinedPlayer) => {
    confirmRoleViewBySessionToken(joinedPlayer.sessionToken)
  })
}

const fastForwardToDayVote = () => {
  const state = getRoomState()

  while (state.phase.startsWith('NIGHT_')) {
    applyPhaseTimeoutInRoom()
  }

  if (state.phase === GAME_PHASES.dayHunterNight) {
    applyPhaseTimeoutInRoom()
  }

  if (state.phase === GAME_PHASES.dayReveal) {
    advanceDayPhaseInRoom()
  }

  if (state.phase === GAME_PHASES.dayLastWords) {
    advanceDayPhaseInRoom()
  }

  if (state.phase === GAME_PHASES.dayDiscussion) {
    advanceDayPhaseInRoom()
  }

  assert.equal(state.phase, GAME_PHASES.dayVote)
}

const countRoles = (role: RoleKind): number => {
  return getRoomState().players.filter((player) => player.role === role).length
}

beforeEach(() => {
  resetRoomStore()
})

test('start game loads preset and assigns role counts for 8 players', () => {
  const joinedPlayers = createPlayers(8)
  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)

  const state = getRoomState()

  assert.equal(state.status, 'RUNNING')
  assert.equal(state.phase, GAME_PHASES.roleView)
  assert.equal(state.config.presetId, 'standard_8')
  assert.equal(countRoles('WOLF'), 2)
  assert.equal(countRoles('VILLAGER'), 3)
  assert.equal(countRoles('SEER'), 1)
  assert.equal(countRoles('WITCH'), 1)
  assert.equal(countRoles('HUNTER'), 1)

  confirmAllRoles(joinedPlayers)
  assert.equal(state.phase, GAME_PHASES.nightWolf)
})

test('guard protection blocks wolf kill during night resolve', () => {
  const joinedPlayers = createPlayers(12)
  const sessionMap = createSessionMap(joinedPlayers)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)
  confirmAllRoles(joinedPlayers)

  const state = getRoomState()
  const wolfPlayers = state.players.filter((player) => player.role === 'WOLF')
  const seerPlayer = state.players.find((player) => player.role === 'SEER')
  const guardPlayer = state.players.find((player) => player.role === 'GUARD')
  const witchPlayer = state.players.find((player) => player.role === 'WITCH')
  const villagerTarget = state.players.find(
    (player) => player.role === 'VILLAGER'
  )

  assert.ok(seerPlayer)
  assert.ok(guardPlayer)
  assert.ok(witchPlayer)
  assert.ok(villagerTarget)

  wolfPlayers.forEach((wolfPlayer) => {
    submitWolfKillBySessionToken(
      sessionMap.get(wolfPlayer.id)!,
      villagerTarget.id
    )
  })

  submitSeerCheckBySessionToken(
    sessionMap.get(seerPlayer.id)!,
    villagerTarget.id
  )
  submitGuardProtectBySessionToken(
    sessionMap.get(guardPlayer.id)!,
    villagerTarget.id
  )
  submitWitchActionBySessionToken(sessionMap.get(witchPlayer.id)!, 'SKIP')

  assert.equal(state.phase, GAME_PHASES.dayReveal)
  assert.equal(villagerTarget.alive, true)
  assert.equal(state.deadPlayers.length, 0)
})

test('vote tie then revote tie leads to no elimination and next night', () => {
  const joinedPlayers = createPlayers(7)
  const sessionMap = createSessionMap(joinedPlayers)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)
  confirmAllRoles(joinedPlayers)
  fastForwardToDayVote()

  const state = getRoomState()
  const voters = state.players.filter(
    (player) => player.alive && player.canVote
  )
  const candidateA = voters[0].id
  const candidateB = voters[1].id

  voters.forEach((voter, index) => {
    const targetId = index % 2 === 0 ? candidateA : candidateB
    submitDayVoteBySessionToken(sessionMap.get(voter.id)!, targetId)
  })

  assert.equal(state.phase, GAME_PHASES.dayRevote)

  voters.forEach((voter, index) => {
    const targetId = index % 2 === 0 ? candidateA : candidateB
    submitDayVoteBySessionToken(sessionMap.get(voter.id)!, targetId)
  })

  assert.equal(state.phase, GAME_PHASES.dayVoteResult)
  assert.equal(state.lastVoteResult?.isTie, true)

  advanceDayPhaseInRoom()

  assert.equal(state.phase, GAME_PHASES.nightWolf)
  assert.equal(state.round, 2)
})

test('idiot survives vote elimination and loses voting right', () => {
  const joinedPlayers = createPlayers(11)
  const sessionMap = createSessionMap(joinedPlayers)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)
  confirmAllRoles(joinedPlayers)
  fastForwardToDayVote()

  const state = getRoomState()
  const idiot = state.players.find((player) => player.role === 'IDIOT')
  assert.ok(idiot)

  const voters = state.players.filter(
    (player) => player.alive && player.canVote
  )

  voters.forEach((voter) => {
    submitDayVoteBySessionToken(sessionMap.get(voter.id)!, idiot.id)
  })

  assert.equal(state.phase, GAME_PHASES.dayIdiotReveal)
  assert.equal(idiot.alive, true)
  assert.equal(idiot.canVote, false)
})

test('hunter vote elimination triggers hunter shot phase', () => {
  const joinedPlayers = createPlayers(8)
  const sessionMap = createSessionMap(joinedPlayers)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)
  confirmAllRoles(joinedPlayers)
  fastForwardToDayVote()

  const state = getRoomState()
  const hunter = state.players.find((player) => player.role === 'HUNTER')
  const target = state.players.find(
    (player) => player.alive && player.role === 'VILLAGER'
  )

  assert.ok(hunter)
  assert.ok(target)

  const voters = state.players.filter(
    (player) => player.alive && player.canVote
  )
  voters.forEach((voter) => {
    submitDayVoteBySessionToken(sessionMap.get(voter.id)!, hunter.id)
  })

  assert.equal(state.phase, GAME_PHASES.dayHunterVote)
  submitHunterShotBySessionToken(sessionMap.get(hunter.id)!, target.id)

  assert.equal(target.alive, false)
  assert.equal(state.phase, GAME_PHASES.dayVoteResult)
})

test('victory detection covers massacre and side-kill rules', () => {
  const sixPlayers = createPlayers(6)
  startGameBySessionToken(sixPlayers[0].sessionToken, () => 0)
  confirmAllRoles(sixPlayers)

  const firstState = getRoomState()
  firstState.players.forEach((player) => {
    player.alive = false
  })

  const wolves = firstState.players.filter((player) => player.role === 'WOLF')
  const goodPlayers = firstState.players.filter(
    (player) => player.role !== 'WOLF'
  )

  wolves.slice(0, 2).forEach((wolf) => {
    wolf.alive = true
  })
  goodPlayers.slice(0, 2).forEach((goodPlayer) => {
    goodPlayer.alive = true
  })

  assert.equal(evaluateVictoryInRoom(), true)
  assert.equal(firstState.gameResult?.winner, 'WOLF')

  resetRoomStore()

  const tenPlayers = createPlayers(10)
  startGameBySessionToken(tenPlayers[0].sessionToken, () => 0)
  confirmAllRoles(tenPlayers)

  const secondState = getRoomState()
  secondState.players.forEach((player) => {
    if (['SEER', 'WITCH', 'HUNTER', 'GUARD', 'IDIOT'].includes(player.role)) {
      player.alive = false
      return
    }

    player.alive = player.role === 'WOLF' || player.role === 'VILLAGER'
  })

  assert.equal(evaluateVictoryInRoom(), true)
  assert.equal(secondState.gameResult?.winner, 'WOLF')
})
