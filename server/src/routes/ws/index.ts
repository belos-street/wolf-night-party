import type { FastifyPluginAsync } from 'fastify'
import { ZodError } from 'zod'

import {
  createGameSnapshot,
  getPlayerBySessionToken
} from '../../game/room-store.js'
import { SERVER_WS_EVENTS } from '../../shared/constants/ws-events.js'
import {
  wsConnectQueryJsonSchema,
  wsEnvelopeSchema
} from '../../shared/schemas/api-schemas.js'

type WsIncomingData = string | Buffer | ArrayBuffer | Buffer[]

type WsConnectQuery = {
  sessionToken?: string
}

const parseJsonString = (message: WsIncomingData): unknown => {
  if (typeof message === 'string') {
    return JSON.parse(message)
  }

  if (message instanceof ArrayBuffer) {
    return JSON.parse(Buffer.from(message).toString())
  }

  if (Array.isArray(message)) {
    return JSON.parse(Buffer.concat(message).toString())
  }

  return JSON.parse(message.toString())
}

const resolveSessionToken = (
  headers: Record<string, unknown>,
  query: WsConnectQuery
): string | undefined => {
  const rawHeaderToken = headers['x-session-token']
  const headerToken =
    typeof rawHeaderToken === 'string' ? rawHeaderToken : undefined

  if (headerToken) {
    return headerToken
  }

  return query.sessionToken
}

const wsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: WsConnectQuery }>(
    '/',
    {
      websocket: true,
      schema: {
        querystring: wsConnectQueryJsonSchema
      }
    },
    (socket, request) => {
      const sessionToken = resolveSessionToken(
        request.headers as Record<string, unknown>,
        request.query
      )

      if (
        typeof sessionToken !== 'string' ||
        !getPlayerBySessionToken(sessionToken)
      ) {
        socket.send(
          JSON.stringify({
            event: SERVER_WS_EVENTS.gameError,
            payload: {
              code: 'UNAUTHORIZED',
              message: 'Session token is invalid'
            },
            ts: Date.now()
          })
        )
        socket.close()
        return
      }

      socket.send(
        JSON.stringify({
          event: SERVER_WS_EVENTS.gameSnapshot,
          payload: createGameSnapshot(),
          ts: Date.now()
        })
      )

      socket.on('error', (error: Error) => {
        request.log.error({ err: error }, 'websocket connection error')
      })

      socket.on('close', () => {
        request.log.info({ requestId: request.id }, 'websocket closed')
      })

      socket.on('message', (rawMessage: WsIncomingData) => {
        try {
          const payload = parseJsonString(rawMessage)
          const envelope = wsEnvelopeSchema.parse(payload)

          socket.send(
            JSON.stringify({
              event: SERVER_WS_EVENTS.gamePhaseChange,
              payload: {
                phase: 'WAITING',
                receivedEvent: envelope.event,
                requestId: envelope.requestId ?? null
              },
              ts: Date.now()
            })
          )
        } catch (error) {
          const message =
            error instanceof ZodError
              ? 'WebSocket message schema validation failed'
              : 'WebSocket message parsing failed'

          socket.send(
            JSON.stringify({
              event: SERVER_WS_EVENTS.gameError,
              payload: {
                code: 'BAD_REQUEST',
                message
              },
              ts: Date.now()
            })
          )
        }
      })
    }
  )
}

export default wsRoutes
