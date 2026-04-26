export type HttpErrorDescriptor = {
  code: string
  statusCode: number
  message: string
  retryable: boolean
}

const DEFAULT_HTTP_ERROR: HttpErrorDescriptor = {
  code: 'INTERNAL_ERROR',
  statusCode: 500,
  message: 'Internal server error',
  retryable: false
}

const BUSINESS_ERROR_MAP: Record<string, HttpErrorDescriptor> = {
  BAD_REQUEST: {
    code: 'BAD_REQUEST',
    statusCode: 400,
    message: 'Invalid request payload',
    retryable: true
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    statusCode: 401,
    message: 'Unauthorized',
    retryable: false
  },
  GAME_ALREADY_STARTED: {
    code: 'GAME_ALREADY_STARTED',
    statusCode: 409,
    message: 'Game already started',
    retryable: false
  },
  PLAYER_LIMIT_EXCEEDED: {
    code: 'PLAYER_LIMIT_EXCEEDED',
    statusCode: 409,
    message: 'Room player limit reached',
    retryable: false
  }
}

export const resolveHttpErrorDescriptor = (
  error: Error & { code?: string; statusCode?: number }
): HttpErrorDescriptor => {
  const key = typeof error.code === 'string' ? error.code : error.message
  const mappedError = BUSINESS_ERROR_MAP[key]

  if (mappedError) {
    return mappedError
  }

  if (typeof error.statusCode === 'number' && error.statusCode >= 400) {
    return {
      code: error.statusCode >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
      statusCode: error.statusCode,
      message:
        error.statusCode >= 500 ? DEFAULT_HTTP_ERROR.message : error.message,
      retryable: false
    }
  }

  return DEFAULT_HTTP_ERROR
}
