import { z } from 'zod'

import { CLIENT_WS_EVENTS, SERVER_WS_EVENTS } from '../constants/ws-events.js'

const wsEventValues = Object.values(CLIENT_WS_EVENTS)

const errorCodeSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 64
} as const

const errorMessageSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 256
} as const

export const joinRequestSchema = z.object({
  nickname: z.string().trim().min(1).max(10),
  avatarId: z.string().trim().min(1).max(32).optional()
})

export const wsEnvelopeSchema = z.object({
  event: z.enum(wsEventValues as [string, ...string[]]),
  requestId: z.string().trim().min(1).max(64).optional(),
  payload: z.record(z.string(), z.unknown()).default({})
})

export const wsServerErrorSchema = z.object({
  code: z.string().trim().min(1).max(64),
  message: z.string().trim().min(1).max(256)
})

export const wsServerEventSchema = z.object({
  event: z.enum(Object.values(SERVER_WS_EVENTS) as [string, ...string[]]),
  payload: z.record(z.string(), z.unknown()).default({}),
  ts: z.number().int().positive()
})

export const apiErrorResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'error'],
  properties: {
    ok: { const: false },
    error: {
      type: 'object',
      additionalProperties: false,
      required: ['code', 'message', 'retryable'],
      properties: {
        code: errorCodeSchema,
        message: errorMessageSchema,
        retryable: { type: 'boolean' }
      }
    }
  }
} as const

export const healthSuccessResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'data'],
  properties: {
    ok: { const: true },
    data: {
      type: 'object',
      additionalProperties: false,
      required: ['service', 'status'],
      properties: {
        service: { type: 'string', minLength: 1, maxLength: 64 },
        status: { const: 'up' }
      }
    }
  }
} as const

export const joinRequestBodyJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['nickname'],
  properties: {
    nickname: { type: 'string', minLength: 1, maxLength: 10 },
    avatarId: { type: 'string', minLength: 1, maxLength: 32 }
  }
} as const

export const joinSuccessResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'data'],
  properties: {
    ok: { const: true },
    data: {
      type: 'object',
      additionalProperties: false,
      required: ['roomId', 'playerId', 'sessionToken', 'isHost'],
      properties: {
        roomId: { type: 'string', minLength: 1, maxLength: 64 },
        playerId: { type: 'string', minLength: 1, maxLength: 64 },
        sessionToken: { type: 'string', minLength: 1, maxLength: 128 },
        isHost: { type: 'boolean' }
      }
    }
  }
} as const

export const wsConnectQueryJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sessionToken: { type: 'string', minLength: 1, maxLength: 128 }
  }
} as const

export type JoinRequestInput = z.infer<typeof joinRequestSchema>
export type WsEnvelopeInput = z.infer<typeof wsEnvelopeSchema>
