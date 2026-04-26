import * as assert from 'node:assert'
import { test } from 'node:test'

import { CLIENT_WS_EVENTS } from '../../src/shared/constants/ws-events.js'
import { wsEnvelopeSchema } from '../../src/shared/schemas/api-schemas.js'

test('ws envelope schema parses valid payload', () => {
  const parsed = wsEnvelopeSchema.parse({
    event: CLIENT_WS_EVENTS.daySubmitVote,
    requestId: 'req_1',
    payload: {
      targetId: 'p_001'
    }
  })

  assert.equal(parsed.event, CLIENT_WS_EVENTS.daySubmitVote)
  assert.equal(parsed.requestId, 'req_1')
  assert.deepStrictEqual(parsed.payload, { targetId: 'p_001' })
})

test('ws envelope schema rejects invalid payload', () => {
  const result = wsEnvelopeSchema.safeParse({
    event: 'not-supported-event'
  })

  assert.equal(result.success, false)
})
