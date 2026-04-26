import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import fp from 'fastify-plugin'

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]

const parseAllowedOrigins = (): string[] => {
  const rawOrigins = process.env.ALLOWED_ORIGINS

  if (!rawOrigins) {
    return DEFAULT_ALLOWED_ORIGINS
  }

  const origins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)

  if (origins.length === 0) {
    return DEFAULT_ALLOWED_ORIGINS
  }

  return origins
}

export default fp(async (fastify) => {
  const allowedOrigins = parseAllowedOrigins()

  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true)
        return
      }

      callback(null, allowedOrigins.includes(origin))
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token']
  })

  await fastify.register(websocket, {
    options: {
      maxPayload: 64 * 1024
    }
  })

  fastify.addHook('onSend', async (_request, reply, payload) => {
    reply.header('x-content-type-options', 'nosniff')
    reply.header('x-frame-options', 'DENY')
    reply.header('referrer-policy', 'no-referrer')
    reply.header(
      'permissions-policy',
      'camera=(), microphone=(), geolocation=()'
    )

    return payload
  })
})
