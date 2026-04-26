import * as assert from 'node:assert'
import { beforeEach, test } from 'node:test'

import {
  applyDisconnectTimeoutByPlayerId,
  confirmRoleViewBySessionToken,
  getDisconnectDeadlineByPlayerId,
  getRoomState,
  joinRoom,
  listPendingDisconnectCountdowns,
  markPlayerConnectedBySessionToken,
  markPlayerDisconnectedBySessionToken,
  resetRoomStore,
  startGameBySessionToken
} from '../../src/game/room-store.js'

interface JoinedPlayer {
  playerId: string
  sessionToken: string
}

const createPlayers = (count: number): JoinedPlayer[] => {
  const joinedPlayers: JoinedPlayer[] = []

  for (let index = 0; index < count; index += 1) {
    const result = joinRoom(`player-${index + 1}`, `avatar_${index + 1}`)
    joinedPlayers.push({
      playerId: result.playerId,
      sessionToken: result.sessionToken
    })
  }

  return joinedPlayers
}

beforeEach(() => {
  resetRoomStore()
})

test('disconnect in waiting phase does not start countdown', () => {
  const joinedPlayers = createPlayers(1)
  const disconnected = markPlayerDisconnectedBySessionToken(
    joinedPlayers[0].sessionToken
  )

  assert.equal(disconnected.startCountdown, false)
  assert.equal(getDisconnectDeadlineByPlayerId(joinedPlayers[0].playerId), null)

  const connected = markPlayerConnectedBySessionToken(joinedPlayers[0].sessionToken)
  assert.equal(connected.wasDisconnected, true)
})

test('disconnect in running phase starts countdown and reconnect clears it', () => {
  const joinedPlayers = createPlayers(6)
  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)

  joinedPlayers.forEach((joinedPlayer) => {
    confirmRoleViewBySessionToken(joinedPlayer.sessionToken)
  })

  const targetPlayer = joinedPlayers[2]
  const disconnected = markPlayerDisconnectedBySessionToken(targetPlayer.sessionToken)

  assert.equal(disconnected.startCountdown, true)
  assert.equal(disconnected.countdownMs, 120_000)
  assert.notEqual(getDisconnectDeadlineByPlayerId(targetPlayer.playerId), null)

  const connected = markPlayerConnectedBySessionToken(targetPlayer.sessionToken)

  assert.equal(connected.wasDisconnected, true)
  assert.equal(getDisconnectDeadlineByPlayerId(targetPlayer.playerId), null)
})

test('pending disconnect countdown list includes disconnected players', () => {
  const joinedPlayers = createPlayers(6)
  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)

  joinedPlayers.forEach((joinedPlayer) => {
    confirmRoleViewBySessionToken(joinedPlayer.sessionToken)
  })

  const targetPlayer = joinedPlayers[3]
  markPlayerDisconnectedBySessionToken(targetPlayer.sessionToken)

  const pendingCountdowns = listPendingDisconnectCountdowns()
  const found = pendingCountdowns.find(
    (item) => item.playerId === targetPlayer.playerId
  )

  assert.ok(found)
  assert.equal(found.countdownSec > 0, true)
})

test('disconnect timeout eliminates disconnected player and writes death record', () => {
  const joinedPlayers = createPlayers(6)
  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)

  joinedPlayers.forEach((joinedPlayer) => {
    confirmRoleViewBySessionToken(joinedPlayer.sessionToken)
  })

  const targetPlayer = joinedPlayers[1]
  markPlayerDisconnectedBySessionToken(targetPlayer.sessionToken)

  const timeoutResult = applyDisconnectTimeoutByPlayerId(targetPlayer.playerId)
  const state = getRoomState()
  const player = state.players.find((item) => item.id === targetPlayer.playerId)

  assert.equal(timeoutResult.applied, true)
  assert.equal(timeoutResult.gameEnded, false)
  assert.ok(player)
  assert.equal(player.alive, false)
  assert.equal(player.canVote, false)

  const deathRecord = state.deadPlayers.find(
    (record) => record.playerId === targetPlayer.playerId
  )

  assert.ok(deathRecord)
  assert.equal(deathRecord.cause, 'DISCONNECT_TIMEOUT')
})

test('disconnect timeout is ignored when player has already reconnected', () => {
  const joinedPlayers = createPlayers(6)
  startGameBySessionToken(joinedPlayers[0].sessionToken, () => 0)

  const targetPlayer = joinedPlayers[4]
  markPlayerDisconnectedBySessionToken(targetPlayer.sessionToken)
  markPlayerConnectedBySessionToken(targetPlayer.sessionToken)

  const timeoutResult = applyDisconnectTimeoutByPlayerId(targetPlayer.playerId)

  assert.equal(timeoutResult.applied, false)
})
