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

test('host can start a new round from ENDED even if host is dead', () => {
  const joinedPlayers = createPlayers(8)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)

  const state = getRoomState()
  const host = state.players.find((player) => player.isHost)
  assert.ok(host)

  state.status = 'ENDED'
  state.phase = 'ENDED'
  host.alive = false
  host.canVote = false

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)

  assert.equal(state.status, 'RUNNING')
  assert.equal(state.phase, GAME_PHASES.roleView)
  assert.equal(state.round, 1)
  assert.equal(state.players.every((player) => player.alive), true)
  assert.equal(state.players.every((player) => player.canVote), true)
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

test('wolf target mismatch resets night wolf votes and requires reselection', () => {
  const joinedPlayers = createPlayers(8)
  const sessionMap = createSessionMap(joinedPlayers)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)
  confirmAllRoles(joinedPlayers)

  const state = getRoomState()
  const wolves = state.players.filter((player) => player.role === 'WOLF')
  const villagerTargets = state.players.filter((player) => player.role === 'VILLAGER')

  assert.equal(state.phase, GAME_PHASES.nightWolf)
  assert.equal(wolves.length >= 2, true)
  assert.equal(villagerTargets.length >= 2, true)

  submitWolfKillBySessionToken(sessionMap.get(wolves[0].id)!, villagerTargets[0].id)
  submitWolfKillBySessionToken(sessionMap.get(wolves[1].id)!, villagerTargets[1].id)

  assert.equal(state.phase, GAME_PHASES.nightWolf)
  assert.equal(Object.keys(state.nightActionState?.wolfVotes ?? {}).length, 0)

  submitWolfKillBySessionToken(sessionMap.get(wolves[0].id)!, villagerTargets[0].id)
  submitWolfKillBySessionToken(sessionMap.get(wolves[1].id)!, villagerTargets[0].id)

  assert.equal(state.phase, GAME_PHASES.nightSeer)
})

test('wolf can target self in night wolf phase', () => {
  const joinedPlayers = createPlayers(8)
  const sessionMap = createSessionMap(joinedPlayers)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)
  confirmAllRoles(joinedPlayers)

  const state = getRoomState()
  const wolves = state.players.filter((player) => player.role === 'WOLF')
  const seer = state.players.find((player) => player.role === 'SEER')
  const villager = state.players.find((player) => player.role === 'VILLAGER')
  const witch = state.players.find((player) => player.role === 'WITCH')

  assert.equal(wolves.length >= 2, true)
  assert.ok(seer)
  assert.ok(villager)
  assert.ok(witch)

  wolves.forEach((wolf) => {
    submitWolfKillBySessionToken(sessionMap.get(wolf.id)!, wolves[0].id)
  })

  assert.equal(state.phase, GAME_PHASES.nightSeer)

  submitSeerCheckBySessionToken(sessionMap.get(seer.id)!, villager.id)
  submitWitchActionBySessionToken(sessionMap.get(witch.id)!, 'SKIP')

  assert.equal(state.phase, GAME_PHASES.dayReveal)
  assert.equal(wolves[0].alive, false)
})

test('seer cannot check self in night seer phase', () => {
  const joinedPlayers = createPlayers(8)
  const sessionMap = createSessionMap(joinedPlayers)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)
  confirmAllRoles(joinedPlayers)

  const state = getRoomState()
  const wolves = state.players.filter((player) => player.role === 'WOLF')
  const seer = state.players.find((player) => player.role === 'SEER')
  const villager = state.players.find((player) => player.role === 'VILLAGER')

  assert.ok(seer)
  assert.ok(villager)

  wolves.forEach((wolf) => {
    submitWolfKillBySessionToken(sessionMap.get(wolf.id)!, villager.id)
  })

  assert.equal(state.phase, GAME_PHASES.nightSeer)

  assert.throws(() => {
    submitSeerCheckBySessionToken(sessionMap.get(seer.id)!, seer.id)
  }, /INVALID_TARGET/)
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
    const preferredTargetId = index % 2 === 0 ? candidateA : candidateB
    const targetId =
      preferredTargetId === voter.id
        ? preferredTargetId === candidateA
          ? candidateB
          : candidateA
        : preferredTargetId
    submitDayVoteBySessionToken(sessionMap.get(voter.id)!, targetId)
  })

  assert.equal(state.phase, GAME_PHASES.dayPkSpeech)

  advanceDayPhaseInRoom()

  assert.equal(state.phase, GAME_PHASES.dayRevote)

  voters.forEach((voter, index) => {
    const preferredTargetId = index % 2 === 0 ? candidateA : candidateB
    const targetId =
      preferredTargetId === voter.id
        ? preferredTargetId === candidateA
          ? candidateB
          : candidateA
        : preferredTargetId
    submitDayVoteBySessionToken(sessionMap.get(voter.id)!, targetId)
  })

  assert.equal(state.phase, GAME_PHASES.dayVoteResult)
  assert.equal(state.lastVoteResult?.isTie, true)

  advanceDayPhaseInRoom()

  assert.equal(state.phase, GAME_PHASES.nightWolf)
  assert.equal(state.round, 2)
})

test('day vote cannot be changed after submission', () => {
  const joinedPlayers = createPlayers(7)
  const sessionMap = createSessionMap(joinedPlayers)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)
  confirmAllRoles(joinedPlayers)
  fastForwardToDayVote()

  const state = getRoomState()
  const voter = state.players.find((player) => player.alive && player.canVote)
  const targets = state.players.filter((player) => player.alive && player.id !== voter?.id)

  assert.ok(voter)
  assert.equal(targets.length >= 2, true)

  submitDayVoteBySessionToken(sessionMap.get(voter.id)!, targets[0].id)
  assert.throws(() => {
    submitDayVoteBySessionToken(sessionMap.get(voter.id)!, targets[1].id)
  }, /ALREADY_SUBMITTED/)
})

test('day vote cannot target self', () => {
  const joinedPlayers = createPlayers(7)
  const sessionMap = createSessionMap(joinedPlayers)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)
  confirmAllRoles(joinedPlayers)
  fastForwardToDayVote()

  const state = getRoomState()
  const voter = state.players.find((player) => player.alive && player.canVote)

  assert.ok(voter)

  assert.throws(() => {
    submitDayVoteBySessionToken(sessionMap.get(voter.id)!, voter.id)
  }, /INVALID_TARGET/)
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
    const targetId = voter.id === idiot.id ? 'abstain' : idiot.id
    submitDayVoteBySessionToken(sessionMap.get(voter.id)!, targetId)
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
    const targetId = voter.id === hunter.id ? 'abstain' : hunter.id
    submitDayVoteBySessionToken(sessionMap.get(voter.id)!, targetId)
  })

  assert.equal(state.phase, GAME_PHASES.dayHunterVote)
  submitHunterShotBySessionToken(sessionMap.get(hunter.id)!, target.id)

  assert.equal(target.alive, false)
  assert.equal(state.phase, GAME_PHASES.dayVoteResult)
})

test('hunter killed by wolf can shoot in day hunter-night phase', () => {
  const joinedPlayers = createPlayers(8)
  const sessionMap = createSessionMap(joinedPlayers)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)
  confirmAllRoles(joinedPlayers)

  const state = getRoomState()
  const wolfPlayers = state.players.filter((player) => player.role === 'WOLF')
  const seerPlayer = state.players.find((player) => player.role === 'SEER')
  const witchPlayer = state.players.find((player) => player.role === 'WITCH')
  const hunterPlayer = state.players.find((player) => player.role === 'HUNTER')
  const targetVillager = state.players.find((player) => {
    return player.role === 'VILLAGER' && player.alive
  })

  assert.ok(seerPlayer)
  assert.ok(witchPlayer)
  assert.ok(hunterPlayer)
  assert.ok(targetVillager)

  wolfPlayers.forEach((wolfPlayer) => {
    submitWolfKillBySessionToken(sessionMap.get(wolfPlayer.id)!, hunterPlayer.id)
  })
  submitSeerCheckBySessionToken(
    sessionMap.get(seerPlayer.id)!,
    targetVillager.id
  )
  submitWitchActionBySessionToken(sessionMap.get(witchPlayer.id)!, 'SKIP')

  assert.equal(state.phase, GAME_PHASES.dayHunterNight)
  assert.equal(state.hunterActionState?.hunterId, hunterPlayer.id)

  submitHunterShotBySessionToken(
    sessionMap.get(hunterPlayer.id)!,
    targetVillager.id
  )

  assert.equal(targetVillager.alive, false)
  assert.equal(state.phase, GAME_PHASES.dayLastWords)
})

test('hunter poisoned by witch cannot trigger hunter shot phase', () => {
  const joinedPlayers = createPlayers(8)
  const sessionMap = createSessionMap(joinedPlayers)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)
  confirmAllRoles(joinedPlayers)

  const state = getRoomState()
  const wolfPlayers = state.players.filter((player) => player.role === 'WOLF')
  const seerPlayer = state.players.find((player) => player.role === 'SEER')
  const witchPlayer = state.players.find((player) => player.role === 'WITCH')
  const hunterPlayer = state.players.find((player) => player.role === 'HUNTER')
  const villagerTarget = state.players.find((player) => {
    return player.role === 'VILLAGER' && player.alive
  })

  assert.ok(seerPlayer)
  assert.ok(witchPlayer)
  assert.ok(hunterPlayer)
  assert.ok(villagerTarget)

  wolfPlayers.forEach((wolfPlayer) => {
    submitWolfKillBySessionToken(sessionMap.get(wolfPlayer.id)!, villagerTarget.id)
  })
  submitSeerCheckBySessionToken(
    sessionMap.get(seerPlayer.id)!,
    villagerTarget.id
  )
  submitWitchActionBySessionToken(
    sessionMap.get(witchPlayer.id)!,
    'POISON',
    hunterPlayer.id
  )

  assert.equal(state.phase, GAME_PHASES.dayReveal)
  assert.equal(hunterPlayer.alive, false)
  assert.equal(state.hunterActionState, null)
})

test('witch cannot poison self', () => {
  const joinedPlayers = createPlayers(8)
  const sessionMap = createSessionMap(joinedPlayers)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)
  confirmAllRoles(joinedPlayers)

  const state = getRoomState()
  const wolves = state.players.filter((player) => player.role === 'WOLF')
  const seer = state.players.find((player) => player.role === 'SEER')
  const witch = state.players.find((player) => player.role === 'WITCH')
  const villager = state.players.find((player) => player.role === 'VILLAGER')

  assert.ok(seer)
  assert.ok(witch)
  assert.ok(villager)

  wolves.forEach((wolf) => {
    submitWolfKillBySessionToken(sessionMap.get(wolf.id)!, villager.id)
  })
  submitSeerCheckBySessionToken(sessionMap.get(seer.id)!, villager.id)

  assert.equal(state.phase, GAME_PHASES.nightWitch)

  assert.throws(() => {
    submitWitchActionBySessionToken(sessionMap.get(witch.id)!, 'POISON', witch.id)
  }, /INVALID_TARGET/)
})

test('witch cannot self-save after first night', () => {
  const joinedPlayers = createPlayers(8)
  const sessionMap = createSessionMap(joinedPlayers)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)
  confirmAllRoles(joinedPlayers)

  const state = getRoomState()
  const wolves = state.players.filter((player) => player.role === 'WOLF')
  const seer = state.players.find((player) => player.role === 'SEER')
  const witch = state.players.find((player) => player.role === 'WITCH')
  const villager = state.players.find((player) => player.role === 'VILLAGER')

  assert.ok(seer)
  assert.ok(witch)
  assert.ok(villager)

  wolves.forEach((wolf) => {
    submitWolfKillBySessionToken(sessionMap.get(wolf.id)!, witch.id)
  })
  submitSeerCheckBySessionToken(sessionMap.get(seer.id)!, villager.id)

  assert.equal(state.phase, GAME_PHASES.nightWitch)
  state.round = 2

  assert.throws(() => {
    submitWitchActionBySessionToken(sessionMap.get(witch.id)!, 'SAVE')
  }, /INVALID_ACTION/)
})

test('day reveal skips last words when no one died at night', () => {
  const joinedPlayers = createPlayers(12)
  const sessionMap = createSessionMap(joinedPlayers)

  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)
  confirmAllRoles(joinedPlayers)

  const state = getRoomState()
  const wolves = state.players.filter((player) => player.role === 'WOLF')
  const seer = state.players.find((player) => player.role === 'SEER')
  const guard = state.players.find((player) => player.role === 'GUARD')
  const witch = state.players.find((player) => player.role === 'WITCH')
  const villager = state.players.find((player) => player.role === 'VILLAGER')

  assert.equal(wolves.length > 0, true)
  assert.ok(seer)
  assert.ok(guard)
  assert.ok(witch)
  assert.ok(villager)

  wolves.forEach((wolf) => {
    submitWolfKillBySessionToken(sessionMap.get(wolf.id)!, villager.id)
  })
  submitSeerCheckBySessionToken(sessionMap.get(seer.id)!, villager.id)
  submitGuardProtectBySessionToken(sessionMap.get(guard.id)!, villager.id)
  submitWitchActionBySessionToken(sessionMap.get(witch.id)!, 'SKIP')

  assert.equal(state.phase, GAME_PHASES.dayReveal)
  assert.equal(state.deadPlayers.length, 0)

  advanceDayPhaseInRoom()

  assert.equal(state.phase, GAME_PHASES.dayDiscussion)
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
