import { useMemo } from 'react'

import { isMockModeEnabled } from '../lib/mock-mode'
import { useMockGameClient } from './use-mock-game-client'
import { useRealtimeGameClient } from './use-realtime-game-client'

export const useGameClient = () => {
  const mockModeEnabled = useMemo(() => isMockModeEnabled(), [])
  const realtimeClient = useRealtimeGameClient({
    enabled: !mockModeEnabled
  })
  const mockClient = useMockGameClient()

  if (mockModeEnabled) {
    return mockClient
  }

  return realtimeClient
}
