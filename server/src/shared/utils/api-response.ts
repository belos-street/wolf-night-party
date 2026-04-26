import type {
  ApiErrorResponse,
  ApiSuccessResponse
} from '../types/api-contract.js'

export const createSuccessResponse = <TData>(
  data: TData
): ApiSuccessResponse<TData> => {
  return {
    ok: true,
    data
  }
}

export const createErrorResponse = (
  code: string,
  message: string,
  retryable = false
): ApiErrorResponse => {
  return {
    ok: false,
    error: {
      code,
      message,
      retryable
    }
  }
}
