const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off'])

const parseBooleanLike = (value: string | null): boolean | null => {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase()

  if (TRUE_VALUES.has(normalized)) {
    return true
  }

  if (FALSE_VALUES.has(normalized)) {
    return false
  }

  return null
}

const allowedMockRoles = new Set([
  'WOLF',
  'SEER',
  'WITCH',
  'VILLAGER',
  'HUNTER',
  'GUARD',
  'IDIOT'
])

export const isMockModeEnabled = (): boolean => {
  const envMode = parseBooleanLike(import.meta.env.VITE_ENABLE_MOCK ?? null)

  if (typeof window === 'undefined') {
    return envMode ?? false
  }

  const searchParams = new URLSearchParams(window.location.search)
  const queryMode = parseBooleanLike(searchParams.get('mock'))

  if (queryMode !== null) {
    return queryMode
  }

  return envMode ?? false
}

export const resolveMockRolePreference = (): string => {
  if (typeof window === 'undefined') {
    return 'WITCH'
  }

  const searchParams = new URLSearchParams(window.location.search)
  const rawRole = searchParams.get('mockRole')

  if (!rawRole) {
    return 'WITCH'
  }

  const normalized = rawRole.trim().toUpperCase()

  if (allowedMockRoles.has(normalized)) {
    return normalized
  }

  return 'WITCH'
}
