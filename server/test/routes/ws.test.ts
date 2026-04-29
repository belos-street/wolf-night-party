import * as assert from 'node:assert'
import type { AddressInfo } from 'node:net'
import { beforeEach, test } from 'node:test'

import {
  CLIENT_WS_EVENTS,
  SERVER_WS_EVENTS
} from '../../src/shared/constants/ws-events.js'
import { getRoomState, resetRoomStore } from '../../src/game/room-store.js'
import { build } from '../helper.js'

type WsServerEvent = {
  event: string
  payload: Record<string, unknown>
  ts: number
}

type JoinedPlayer = {
  playerId: string
  sessionToken: string
}

let joinNicknameSeed = 1

const waitForOpen = (socket: WebSocket, timeoutMs = 3000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('WS_OPEN_TIMEOUT'))
    }, timeoutMs)

    socket.addEventListener(
      'open',
      () => {
        clearTimeout(timeout)
        resolve()
      },
      { once: true }
    )

    socket.addEventListener(
      'error',
      () => {
        clearTimeout(timeout)
        reject(new Error('WS_OPEN_ERROR'))
      },
      { once: true }
    )
  })
}

const waitForMessageWhere = (
  socket: WebSocket,
  predicate: (event: WsServerEvent) => boolean,
  timeoutMs = 3000
): Promise<WsServerEvent> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.removeEventListener('message', listener)
      reject(new Error('WS_MESSAGE_TIMEOUT'))
    }, timeoutMs)

    const listener = (event: MessageEvent) => {
      if (typeof event.data !== 'string') {
        return
      }

      const parsed = JSON.parse(event.data) as WsServerEvent

      if (!predicate(parsed)) {
        return
      }

      clearTimeout(timeout)
      socket.removeEventListener('message', listener)
      resolve(parsed)
    }

    socket.addEventListener('message', listener)
  })
}

const waitForEvent = (
  socket: WebSocket,
  eventName: string,
  timeoutMs = 3000
) => {
  return waitForMessageWhere(socket, (event) => event.event === eventName, timeoutMs)
}

const waitForPhase = (socket: WebSocket, phase: string, timeoutMs = 3000) => {
  return waitForMessageWhere(
    socket,
    (event) => {
      if (event.event !== SERVER_WS_EVENTS.gamePhaseChange) {
        return false
      }

      return event.payload.phase === phase
    },
    timeoutMs
  )
}

const waitForCondition = async (
  condition: () => boolean,
  timeoutMs = 3000,
  timeoutLabel: string | (() => string) = 'WAIT_CONDITION_TIMEOUT'
): Promise<void> => {
  const startAt = Date.now()

  while (Date.now() - startAt < timeoutMs) {
    if (condition()) {
      return
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 20)
    })
  }

  throw new Error(
    typeof timeoutLabel === 'function' ? timeoutLabel() : timeoutLabel
  )
}

const joinPlayers = async (
  app: Awaited<ReturnType<typeof build>>,
  count: number
): Promise<JoinedPlayer[]> => {
  const players: JoinedPlayer[] = []

  for (let index = 0; index < count; index += 1) {
    const joinResponse = await app.inject({
      method: 'POST',
      url: '/api/join',
      payload: {
        nickname: `u${joinNicknameSeed++}`,
        avatarId: 'avatar_01'
      }
    })

    const joinPayload = JSON.parse(joinResponse.payload) as {
      ok: boolean
      data: {
        playerId: string
        sessionToken: string
      }
    }

    players.push({
      playerId: joinPayload.data.playerId,
      sessionToken: joinPayload.data.sessionToken
    })
  }

  return players
}

const openSockets = async (
  address: AddressInfo,
  players: JoinedPlayer[]
): Promise<WebSocket[]> => {
  const sockets: WebSocket[] = []

  for (const player of players) {
    const socket = new WebSocket(
      `ws://127.0.0.1:${address.port}/ws?sessionToken=${player.sessionToken}`
    )

    await waitForOpen(socket)
    await waitForEvent(socket, SERVER_WS_EVENTS.gameSnapshot)
    sockets.push(socket)
  }

  return sockets
}

const sendClientEvent = (
  socket: WebSocket,
  event: string,
  payload: Record<string, unknown>
) => {
  socket.send(
    JSON.stringify({
      event,
      requestId: `req_${Date.now()}`,
      payload
    })
  )
}

const closeSockets = (sockets: WebSocket[]) => {
  sockets.forEach((socket) => {
    socket.close()
  })
}

beforeEach(() => {
  resetRoomStore()
  joinNicknameSeed = 1
})

test('ws rejects invalid session token', async (t) => {
  const app = await build(t)
  await app.listen({ host: '127.0.0.1', port: 0 })

  const address = app.server.address() as AddressInfo
  const ws = new WebSocket(
    `ws://127.0.0.1:${address.port}/ws?sessionToken=invalid`
  )

  t.after(() => {
    ws.close()
  })

  await waitForOpen(ws)
  const firstMessage = await waitForEvent(ws, SERVER_WS_EVENTS.gameError)

  assert.equal(firstMessage.event, SERVER_WS_EVENTS.gameError)
  assert.equal(firstMessage.payload.code, 'UNAUTHORIZED')
})

test('ws returns snapshot for valid session and validates payload', async (t) => {
  const app = await build(t)
  await app.listen({ host: '127.0.0.1', port: 0 })

  const players = await joinPlayers(app, 1)
  const address = app.server.address() as AddressInfo
  const ws = new WebSocket(
    `ws://127.0.0.1:${address.port}/ws?sessionToken=${players[0].sessionToken}`
  )

  t.after(() => {
    ws.close()
  })

  await waitForOpen(ws)
  const firstMessage = await waitForEvent(ws, SERVER_WS_EVENTS.gameSnapshot)
  assert.equal(firstMessage.payload.roomId, 'room_local')

  ws.send('not-json')
  const secondMessage = await waitForEvent(ws, SERVER_WS_EVENTS.gameError)
  assert.equal(secondMessage.payload.code, 'BAD_REQUEST')
})

test('ws broadcasts latest snapshot to existing clients when a new player connects', async (t) => {
  const app = await build(t)
  await app.listen({ host: '127.0.0.1', port: 0 })

  const address = app.server.address() as AddressInfo
  const firstPlayer = await joinPlayers(app, 1)
  const firstSocket = new WebSocket(
    `ws://127.0.0.1:${address.port}/ws?sessionToken=${firstPlayer[0].sessionToken}`
  )

  t.after(() => {
    firstSocket.close()
  })

  await waitForOpen(firstSocket)
  await waitForEvent(firstSocket, SERVER_WS_EVENTS.gameSnapshot)

  const updatedSnapshotEventPromise = waitForMessageWhere(
    firstSocket,
    (event) => {
      if (event.event !== SERVER_WS_EVENTS.gameSnapshot) {
        return false
      }

      const players = event.payload.players

      return Array.isArray(players) && players.length === 2
    }
  )

  const secondPlayer = await joinPlayers(app, 1)
  const secondSocket = new WebSocket(
    `ws://127.0.0.1:${address.port}/ws?sessionToken=${secondPlayer[0].sessionToken}`
  )

  t.after(() => {
    secondSocket.close()
  })

  await waitForOpen(secondSocket)
  await waitForEvent(secondSocket, SERVER_WS_EVENTS.gameSnapshot)

  const updatedSnapshotEvent = await updatedSnapshotEventPromise

  const players = updatedSnapshotEvent.payload.players
  assert.equal(Array.isArray(players), true)
  assert.equal((players as unknown[]).length, 2)
})

test('ws maps game:start and player:confirm_role to state machine', async (t) => {
  const app = await build(t)
  await app.listen({ host: '127.0.0.1', port: 0 })

  const address = app.server.address() as AddressInfo
  const players = await joinPlayers(app, 6)
  const sockets = await openSockets(address, players)

  t.after(() => {
    closeSockets(sockets)
  })

  const rolePromises = sockets.map((socket) => {
    return waitForEvent(socket, SERVER_WS_EVENTS.gameRoleAssigned)
  })
  const roleViewPromise = waitForPhase(sockets[0], 'ROLE_VIEW')

  sendClientEvent(sockets[0], CLIENT_WS_EVENTS.gameStart, {})

  const roleEvents = await Promise.all(rolePromises)
  const roleViewEvent = await roleViewPromise

  roleEvents.forEach((event) => {
    assert.equal(typeof event.payload.role, 'string')
  })
  assert.equal(roleViewEvent.payload.phase, 'ROLE_VIEW')

  const nightWolfPromise = waitForPhase(sockets[0], 'NIGHT_WOLF', 5000)

  sockets.forEach((socket) => {
    sendClientEvent(socket, CLIENT_WS_EVENTS.playerConfirmRole, {})
  })

  const nightWolfEvent = await nightWolfPromise
  assert.equal(nightWolfEvent.payload.phase, 'NIGHT_WOLF')
})

test('ws returns phase error when action is submitted in invalid phase', async (t) => {
  const app = await build(t)
  await app.listen({ host: '127.0.0.1', port: 0 })

  const address = app.server.address() as AddressInfo
  const players = await joinPlayers(app, 1)
  const sockets = await openSockets(address, players)

  t.after(() => {
    closeSockets(sockets)
  })

  sendClientEvent(sockets[0], CLIENT_WS_EVENTS.daySubmitVote, {
    targetId: 'abstain'
  })

  const errorEvent = await waitForEvent(sockets[0], SERVER_WS_EVENTS.gameError)
  assert.equal(errorEvent.payload.code, 'PHASE_MISMATCH')
})

test('only host can advance DAY_REVEAL and DAY_LAST_WORDS phases', async (t) => {
  const app = await build(t)
  await app.listen({ host: '127.0.0.1', port: 0 })

  const address = app.server.address() as AddressInfo
  const players = await joinPlayers(app, 6)
  const sockets = await openSockets(address, players)

  t.after(() => {
    closeSockets(sockets)
  })

  sendClientEvent(sockets[0], CLIENT_WS_EVENTS.gameStart, {})
  await waitForCondition(
    () => getRoomState().phase === 'ROLE_VIEW',
    5000,
    () => `WAIT_ROLE_VIEW_TIMEOUT phase=${getRoomState().phase}`
  )

  sockets.forEach((socket) => {
    sendClientEvent(socket, CLIENT_WS_EVENTS.playerConfirmRole, {})
  })

  await waitForCondition(
    () => getRoomState().phase.startsWith('NIGHT_'),
    5000,
    () => `WAIT_NIGHT_TIMEOUT phase=${getRoomState().phase}`
  )

  let currentPhase = getRoomState().phase

  while (currentPhase !== 'DAY_REVEAL') {
    sendClientEvent(sockets[0], CLIENT_WS_EVENTS.playerConfirmRole, {})
    await waitForCondition(
      () => getRoomState().phase !== currentPhase,
      5000,
      () => `WAIT_PHASE_ADVANCE_TIMEOUT from=${currentPhase} to=${getRoomState().phase}`
    )
    currentPhase = getRoomState().phase
  }

  sendClientEvent(sockets[1], CLIENT_WS_EVENTS.playerConfirmRole, {})
  const dayRevealErrorEvent = await waitForEvent(sockets[1], SERVER_WS_EVENTS.gameError)
  assert.equal(dayRevealErrorEvent.payload.code, 'HOST_ONLY_ACTION')

  const hostPlayer = getRoomState().players.find((player) => player.isHost)
  assert.ok(hostPlayer)
  hostPlayer.alive = false

  sendClientEvent(sockets[0], CLIENT_WS_EVENTS.playerConfirmRole, {})
  await waitForCondition(
    () => getRoomState().phase === 'DAY_LAST_WORDS',
    5000,
    () => `WAIT_DAY_LAST_WORDS_TIMEOUT phase=${getRoomState().phase}`
  )

  sendClientEvent(sockets[1], CLIENT_WS_EVENTS.playerConfirmRole, {})
  const dayLastWordsErrorEvent = await waitForEvent(
    sockets[1],
    SERVER_WS_EVENTS.gameError
  )
  assert.equal(dayLastWordsErrorEvent.payload.code, 'HOST_ONLY_ACTION')
})

test('ws integration main path reaches day vote result', async (t) => {
  const app = await build(t)
  await app.listen({ host: '127.0.0.1', port: 0 })

  const address = app.server.address() as AddressInfo
  const players = await joinPlayers(app, 6)
  const sockets = await openSockets(address, players)

  t.after(() => {
    closeSockets(sockets)
  })

  sendClientEvent(sockets[0], CLIENT_WS_EVENTS.gameStart, {})
  await waitForCondition(
    () => getRoomState().phase === 'ROLE_VIEW',
    5000,
    () => `WAIT_ROLE_VIEW_TIMEOUT phase=${getRoomState().phase}`
  )

  sockets.forEach((socket) => {
    sendClientEvent(socket, CLIENT_WS_EVENTS.playerConfirmRole, {})
  })
  await waitForCondition(
    () => getRoomState().phase.startsWith('NIGHT_'),
    5000,
    () => `WAIT_NIGHT_TIMEOUT phase=${getRoomState().phase}`
  )

  let currentPhase = getRoomState().phase
  const maxAdvanceSteps = 10

  for (let step = 0; step < maxAdvanceSteps && currentPhase !== 'DAY_VOTE'; step += 1) {
    sendClientEvent(sockets[0], CLIENT_WS_EVENTS.playerConfirmRole, {})
    await waitForCondition(
      () => getRoomState().phase !== currentPhase,
      5000,
      () =>
        `WAIT_PHASE_ADVANCE_TIMEOUT from=${currentPhase} to=${getRoomState().phase}`
    )
    currentPhase = getRoomState().phase
  }

  assert.equal(currentPhase, 'DAY_VOTE')

  const roomState = getRoomState()
  const aliveVoters = roomState.players.filter((player) => {
    return player.alive && player.canVote
  })

  assert.equal(aliveVoters.length > 0, true)

  const voteTargetId = aliveVoters[0].id
  const voteResultEventPromise = waitForEvent(
    sockets[0],
    SERVER_WS_EVENTS.gameVoteResult,
    5000
  )
  const socketByPlayerId = new Map(
    players.map((player, index) => [player.playerId, sockets[index]])
  )

  aliveVoters.forEach((voter) => {
    const socket = socketByPlayerId.get(voter.id)
    assert.ok(socket)

    const targetId = voter.id === voteTargetId ? 'abstain' : voteTargetId
    sendClientEvent(socket, CLIENT_WS_EVENTS.daySubmitVote, {
      targetId
    })
  })
  for (const voter of aliveVoters) {
    await waitForCondition(
      () => {
        const state = getRoomState()

        if (state.phase !== 'DAY_VOTE') {
          return true
        }

        return Boolean(state.voteActionState?.ballots[voter.id])
      },
      5000,
      () => {
        const state = getRoomState()
        const ballotCount = Object.keys(state.voteActionState?.ballots ?? {}).length
        return `WAIT_BALLOT_TIMEOUT voter=${voter.id} phase=${state.phase} ballotCount=${ballotCount}`
      }
    )
  }

  await waitForCondition(
    () => getRoomState().phase === 'DAY_VOTE_RESULT',
    5000,
    () => `WAIT_DAY_VOTE_RESULT_TIMEOUT phase=${getRoomState().phase}`
  )
  assert.equal(getRoomState().phase, 'DAY_VOTE_RESULT')
  assert.equal(getRoomState().lastVoteResult?.isTie, false)

  const voteResultEvent = await voteResultEventPromise
  assert.equal(voteResultEvent.payload.roundNo, 1)
  assert.equal(Array.isArray(voteResultEvent.payload.ballots), true)
  assert.equal(
    (voteResultEvent.payload.ballots as unknown[]).length,
    aliveVoters.length
  )
})

test('ws starts 10s vote countdown and auto advances vote phase on timeout', async (t) => {
  const app = await build(t)
  await app.listen({ host: '127.0.0.1', port: 0 })

  const address = app.server.address() as AddressInfo
  const players = await joinPlayers(app, 6)
  const sockets = await openSockets(address, players)

  t.after(() => {
    closeSockets(sockets)
  })

  sendClientEvent(sockets[0], CLIENT_WS_EVENTS.gameStart, {})
  await waitForCondition(
    () => getRoomState().phase === 'ROLE_VIEW',
    5000,
    () => `WAIT_ROLE_VIEW_TIMEOUT phase=${getRoomState().phase}`
  )

  sockets.forEach((socket) => {
    sendClientEvent(socket, CLIENT_WS_EVENTS.playerConfirmRole, {})
  })
  await waitForCondition(
    () => getRoomState().phase.startsWith('NIGHT_'),
    5000,
    () => `WAIT_NIGHT_TIMEOUT phase=${getRoomState().phase}`
  )

  const voteTimerEventPromise = waitForEvent(
    sockets[0],
    SERVER_WS_EVENTS.gamePhaseTimer,
    15_000
  )

  let currentPhase = getRoomState().phase
  const maxAdvanceSteps = 10

  for (let step = 0; step < maxAdvanceSteps && currentPhase !== 'DAY_VOTE'; step += 1) {
    sendClientEvent(sockets[0], CLIENT_WS_EVENTS.playerConfirmRole, {})
    await waitForCondition(
      () => getRoomState().phase !== currentPhase,
      5000,
      () =>
        `WAIT_PHASE_ADVANCE_TIMEOUT from=${currentPhase} to=${getRoomState().phase}`
    )
    currentPhase = getRoomState().phase
  }

  assert.equal(currentPhase, 'DAY_VOTE')

  const voteTimerEvent = await voteTimerEventPromise
  assert.equal(voteTimerEvent.payload.scope, 'VOTE')
  assert.equal(voteTimerEvent.payload.durationSec, 10)
  assert.equal(typeof voteTimerEvent.payload.deadlineAt, 'number')

  await waitForCondition(
    () => getRoomState().phase === 'DAY_REVOTE',
    13_000,
    () => `WAIT_DAY_REVOTE_TIMEOUT phase=${getRoomState().phase}`
  )
})

test('ws sends private seer result event after seer submits check', async (t) => {
  const app = await build(t)
  await app.listen({ host: '127.0.0.1', port: 0 })

  const address = app.server.address() as AddressInfo
  const players = await joinPlayers(app, 8)
  const sockets = await openSockets(address, players)

  t.after(() => {
    closeSockets(sockets)
  })

  sendClientEvent(sockets[0], CLIENT_WS_EVENTS.gameStart, {})
  await waitForCondition(
    () => getRoomState().phase === 'ROLE_VIEW',
    5000,
    () => `WAIT_ROLE_VIEW_TIMEOUT phase=${getRoomState().phase}`
  )

  sockets.forEach((socket) => {
    sendClientEvent(socket, CLIENT_WS_EVENTS.playerConfirmRole, {})
  })
  await waitForCondition(
    () => getRoomState().phase === 'NIGHT_WOLF',
    5000,
    () => `WAIT_NIGHT_WOLF_TIMEOUT phase=${getRoomState().phase}`
  )

  const roomStateAtNightWolf = getRoomState()
  const socketByPlayerId = new Map(
    players.map((player, index) => [player.playerId, sockets[index]])
  )
  const wolves = roomStateAtNightWolf.players.filter((player) => {
    return player.alive && player.role === 'WOLF'
  })
  const seer = roomStateAtNightWolf.players.find((player) => {
    return player.alive && player.role === 'SEER'
  })
  const target = roomStateAtNightWolf.players.find((player) => {
    return player.alive && player.id !== seer?.id
  })

  assert.ok(seer)
  assert.ok(target)
  assert.equal(wolves.length > 0, true)

  wolves.forEach((wolf) => {
    const wolfSocket = socketByPlayerId.get(wolf.id)
    assert.ok(wolfSocket)
    sendClientEvent(wolfSocket, CLIENT_WS_EVENTS.nightSubmitKill, {
      targetId: target!.id
    })
  })

  await waitForCondition(
    () => getRoomState().phase === 'NIGHT_SEER',
    5000,
    () => `WAIT_NIGHT_SEER_TIMEOUT phase=${getRoomState().phase}`
  )

  const seerSocket = socketByPlayerId.get(seer.id)
  assert.ok(seerSocket)

  sendClientEvent(seerSocket, CLIENT_WS_EVENTS.nightSubmitSeer, {
    targetId: target.id
  })

  const seerResultEvent = await waitForMessageWhere(
    seerSocket,
    (event) => {
      if (event.event !== SERVER_WS_EVENTS.gameNightAction) {
        return false
      }

      return event.payload.title === 'SEER_RESULT'
    },
    5000
  )

  assert.equal(seerResultEvent.payload.targetId, target.id)
  assert.equal(typeof seerResultEvent.payload.targetName, 'string')
  assert.equal(
    seerResultEvent.payload.alignment === 'GOOD' ||
      seerResultEvent.payload.alignment === 'WOLF',
    true
  )
})

test('ws sends wolf sync event to wolves after kill submission', async (t) => {
  const app = await build(t)
  await app.listen({ host: '127.0.0.1', port: 0 })

  const address = app.server.address() as AddressInfo
  const players = await joinPlayers(app, 8)
  const sockets = await openSockets(address, players)

  t.after(() => {
    closeSockets(sockets)
  })

  sendClientEvent(sockets[0], CLIENT_WS_EVENTS.gameStart, {})
  await waitForCondition(
    () => getRoomState().phase === 'ROLE_VIEW',
    5000,
    () => `WAIT_ROLE_VIEW_TIMEOUT phase=${getRoomState().phase}`
  )

  sockets.forEach((socket) => {
    sendClientEvent(socket, CLIENT_WS_EVENTS.playerConfirmRole, {})
  })
  await waitForCondition(
    () => getRoomState().phase === 'NIGHT_WOLF',
    5000,
    () => `WAIT_NIGHT_WOLF_TIMEOUT phase=${getRoomState().phase}`
  )

  const roomState = getRoomState()
  const socketByPlayerId = new Map(
    players.map((player, index) => [player.playerId, sockets[index]])
  )
  const wolves = roomState.players.filter((player) => {
    return player.alive && player.role === 'WOLF'
  })
  const target = roomState.players.find((player) => {
    return player.alive && player.id !== wolves[0]?.id
  })

  assert.equal(wolves.length > 0, true)
  assert.ok(target)

  const submitter = wolves[0]
  const submitterSocket = socketByPlayerId.get(submitter.id)
  assert.ok(submitterSocket)

  sendClientEvent(submitterSocket, CLIENT_WS_EVENTS.nightSubmitKill, {
    targetId: target.id
  })

  const wolfSyncEvent = await waitForMessageWhere(
    submitterSocket,
    (event) => {
      if (event.event !== SERVER_WS_EVENTS.gameNightAction) {
        return false
      }

      return event.payload.title === 'WOLF_SYNC'
    },
    5000
  )

  assert.equal(Array.isArray(wolfSyncEvent.payload.votes), true)
  assert.equal((wolfSyncEvent.payload.votes as unknown[]).length > 0, true)
})
