import * as path from 'node:path'
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload'
import { FastifyError, FastifyPluginAsync } from 'fastify'
import { fileURLToPath } from 'node:url'

import { resolveHttpErrorDescriptor } from './shared/errors/http-error-map.js'
import { createErrorResponse } from './shared/utils/api-response.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export type AppOptions = {
  // Place your custom options for app below here.
} & Partial<AutoloadPluginOptions>

// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
}

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  fastify.setErrorHandler(
    (error: FastifyError, request, reply) => {
      request.log.error({ err: error }, 'request failed')

      if (error.validation) {
        return reply.code(400).send(
          createErrorResponse(
            'BAD_REQUEST',
            'Invalid request payload',
            true
          )
        )
      }

      const descriptor = resolveHttpErrorDescriptor(error)
      return reply
        .code(descriptor.statusCode)
        .send(
          createErrorResponse(
            descriptor.code,
            descriptor.message,
            descriptor.retryable
          )
        )
    }
  )

  fastify.setNotFoundHandler((request, reply) => {
    return reply
      .code(404)
      .send(
        createErrorResponse(
          'NOT_FOUND',
          `Route ${request.method} ${request.url} not found`,
          false
        )
      )
  })

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: opts,
    forceESM: true
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: opts,
    forceESM: true
  })
}

export default app
export { app, options }
