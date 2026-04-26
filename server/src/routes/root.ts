import { FastifyPluginAsync } from 'fastify'

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get(
    '/',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['root'],
            properties: {
              root: { type: 'boolean' }
            }
          }
        }
      }
    },
    async function () {
      return { root: true }
    }
  )
}

export default root
