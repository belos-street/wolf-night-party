import * as assert from 'node:assert'
import { beforeEach, test } from 'node:test'

import { resetRoomStore } from '../../src/game/room-store.js'
import { build } from '../helper.js'

beforeEach(() => {
  resetRoomStore()
})

test('health route returns service status', async (t) => {
  const app = await build(t)

  const response = await app.inject({
    method: 'GET',
    url: '/api/health'
  })

  assert.equal(response.statusCode, 200)
  assert.deepStrictEqual(JSON.parse(response.payload), {
    ok: true,
    data: {
      service: 'wolf-night-party',
      status: 'up'
    }
  })
})

test('join route returns session info', async (t) => {
  const app = await build(t)

  const response = await app.inject({
    method: 'POST',
    url: '/api/join',
    payload: {
      nickname: '张三',
      avatarId: 'avatar_02'
    }
  })

  assert.equal(response.statusCode, 200)

  const body = JSON.parse(response.payload)
  assert.equal(body.ok, true)
  assert.equal(body.data.roomId, 'room_local')
  assert.equal(body.data.isHost, true)
  assert.equal(typeof body.data.playerId, 'string')
  assert.equal(typeof body.data.sessionToken, 'string')
})

test('join route validates payload', async (t) => {
  const app = await build(t)

  const response = await app.inject({
    method: 'POST',
    url: '/api/join',
    payload: {
      nickname: ''
    }
  })

  assert.equal(response.statusCode, 400)

  const body = JSON.parse(response.payload)
  assert.equal(body.ok, false)
  assert.equal(body.error.code, 'BAD_REQUEST')
})

test('join route rejects duplicated nickname', async (t) => {
  const app = await build(t)

  const firstJoinResponse = await app.inject({
    method: 'POST',
    url: '/api/join',
    payload: {
      nickname: 'P1'
    }
  })

  assert.equal(firstJoinResponse.statusCode, 200)

  const duplicatedJoinResponse = await app.inject({
    method: 'POST',
    url: '/api/join',
    payload: {
      nickname: 'p1'
    }
  })

  assert.equal(duplicatedJoinResponse.statusCode, 409)

  const body = JSON.parse(duplicatedJoinResponse.payload)
  assert.equal(body.ok, false)
  assert.equal(body.error.code, 'NICKNAME_DUPLICATE')
})
