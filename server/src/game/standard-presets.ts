import type { RoleKind, VictoryRule } from '../shared/types/domain-models.js'

export interface StandardPreset {
  playerCount: number
  roleCounts: Record<RoleKind, number>
  victoryRule: VictoryRule
  presetId: string
}

const PRESET_ROLE_BASE: Record<RoleKind, number> = {
  VILLAGER: 0,
  WOLF: 0,
  SEER: 0,
  WITCH: 0,
  HUNTER: 0,
  GUARD: 0,
  IDIOT: 0
}

const createPreset = (
  playerCount: number,
  roleCounts: Partial<Record<RoleKind, number>>,
  victoryRule: VictoryRule
): StandardPreset => {
  return {
    playerCount,
    roleCounts: {
      ...PRESET_ROLE_BASE,
      ...roleCounts
    },
    victoryRule,
    presetId: `standard_${playerCount}`
  }
}

export const STANDARD_PRESETS: Record<number, StandardPreset> = {
  6: createPreset(
    6,
    {
      WOLF: 2,
      VILLAGER: 2,
      SEER: 1,
      WITCH: 1
    },
    'MASSACRE'
  ),
  7: createPreset(
    7,
    {
      WOLF: 2,
      VILLAGER: 3,
      SEER: 1,
      WITCH: 1
    },
    'MASSACRE'
  ),
  8: createPreset(
    8,
    {
      WOLF: 2,
      VILLAGER: 3,
      SEER: 1,
      WITCH: 1,
      HUNTER: 1
    },
    'MASSACRE'
  ),
  9: createPreset(
    9,
    {
      WOLF: 3,
      VILLAGER: 3,
      SEER: 1,
      WITCH: 1,
      HUNTER: 1
    },
    'MASSACRE'
  ),
  10: createPreset(
    10,
    {
      WOLF: 3,
      VILLAGER: 4,
      SEER: 1,
      WITCH: 1,
      HUNTER: 1
    },
    'SIDE_KILL'
  ),
  11: createPreset(
    11,
    {
      WOLF: 3,
      VILLAGER: 4,
      SEER: 1,
      WITCH: 1,
      HUNTER: 1,
      IDIOT: 1
    },
    'SIDE_KILL'
  ),
  12: createPreset(
    12,
    {
      WOLF: 4,
      VILLAGER: 4,
      SEER: 1,
      WITCH: 1,
      HUNTER: 1,
      GUARD: 1
    },
    'SIDE_KILL'
  )
}

export const getStandardPreset = (
  playerCount: number
): StandardPreset | undefined => {
  return STANDARD_PRESETS[playerCount]
}

export const buildRoleDeckByPreset = (preset: StandardPreset): RoleKind[] => {
  const roleDeck: RoleKind[] = []

  ;(Object.keys(preset.roleCounts) as RoleKind[]).forEach((role) => {
    const count = preset.roleCounts[role]

    for (let index = 0; index < count; index += 1) {
      roleDeck.push(role)
    }
  })

  return roleDeck
}
