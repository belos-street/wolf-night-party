import type { PlayerPublic } from './domain-models.js'
import type { ClientWsEvent, ServerWsEvent } from '../constants/ws-events.js'

export interface ApiError {
  code: string
  message: string
  retryable: boolean
}

export interface ApiSuccessResponse<TData> {
  ok: true
  data: TData
}

export interface ApiErrorResponse {
  ok: false
  error: ApiError
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse

export interface JoinRequest {
  nickname: string
  avatarId?: string
}

export interface JoinResponse {
  roomId: string
  playerId: string
  sessionToken: string
  isHost: boolean
}

export interface HealthResponse {
  service: string
  status: 'up'
}

export interface GameSnapshot {
  roomId: string
  status: 'WAITING' | 'RUNNING' | 'ENDED'
  phase: string
  players: PlayerPublic[]
}

export interface WsEnvelope<TPayload = Record<string, unknown>> {
  event: ClientWsEvent
  requestId?: string
  payload: TPayload
}

export interface WsServerEvent<TPayload = Record<string, unknown>> {
  event: ServerWsEvent
  payload: TPayload
  ts: number
}
