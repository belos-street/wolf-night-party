import type { FastifyPluginAsync } from 'fastify'

import { joinRoom } from '../../game/room-store.js'
import {
  apiErrorResponseJsonSchema,
  healthSuccessResponseJsonSchema,
  joinRequestBodyJsonSchema,
  joinSuccessResponseJsonSchema
} from '../../shared/schemas/api-schemas.js'
import type { JoinRequest } from '../../shared/types/api-contract.js'
import { createSuccessResponse } from '../../shared/utils/api-response.js'

const apiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/health',
    {
      schema: {
        response: {
          200: healthSuccessResponseJsonSchema,
          500: apiErrorResponseJsonSchema
        }
      }
    },
    async (_request, reply) => {
      return reply.send(
        createSuccessResponse({
          service: 'wolf-night-party',
          status: 'up' as const
        })
      )
    }
  )

  fastify.post<{ Body: JoinRequest }>(
    '/join',
    {
      schema: {
        body: joinRequestBodyJsonSchema,
        response: {
          200: joinSuccessResponseJsonSchema,
          400: apiErrorResponseJsonSchema,
          409: apiErrorResponseJsonSchema,
          500: apiErrorResponseJsonSchema
        }
      }
    },
    async (request, reply) => {
      const joinResult = joinRoom(
        request.body.nickname,
        request.body.avatarId ?? 'avatar_01'
      )

      return reply.send(createSuccessResponse(joinResult))
    }
  )
}

export default apiRoutes
