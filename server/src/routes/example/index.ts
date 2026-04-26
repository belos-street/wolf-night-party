import { FastifyPluginAsync } from 'fastify'

const example: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get(
    '/',
    {
      schema: {
        response: {
          200: {
            type: 'string'
          }
        }
      }
    },
    async function () {
      return 'this is an example'
    }
  )
}

export default example
