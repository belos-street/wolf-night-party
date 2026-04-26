export type VictoryRule = 'MASSACRE' | 'SIDE_KILL'

export interface StandardPreset {
  playerCount: number
  victoryRule: VictoryRule
  roleCounts: Record<string, number>
}

export const STANDARD_PRESETS: Record<number, StandardPreset> = {
  6: {
    playerCount: 6,
    victoryRule: 'MASSACRE',
    roleCounts: { WOLF: 2, VILLAGER: 2, SEER: 1, WITCH: 1 }
  },
  7: {
    playerCount: 7,
    victoryRule: 'MASSACRE',
    roleCounts: { WOLF: 2, VILLAGER: 3, SEER: 1, WITCH: 1 }
  },
  8: {
    playerCount: 8,
    victoryRule: 'MASSACRE',
    roleCounts: { WOLF: 2, VILLAGER: 3, SEER: 1, WITCH: 1, HUNTER: 1 }
  },
  9: {
    playerCount: 9,
    victoryRule: 'MASSACRE',
    roleCounts: { WOLF: 3, VILLAGER: 3, SEER: 1, WITCH: 1, HUNTER: 1 }
  },
  10: {
    playerCount: 10,
    victoryRule: 'SIDE_KILL',
    roleCounts: { WOLF: 3, VILLAGER: 4, SEER: 1, WITCH: 1, HUNTER: 1 }
  },
  11: {
    playerCount: 11,
    victoryRule: 'SIDE_KILL',
    roleCounts: {
      WOLF: 3,
      VILLAGER: 4,
      SEER: 1,
      WITCH: 1,
      HUNTER: 1,
      IDIOT: 1
    }
  },
  12: {
    playerCount: 12,
    victoryRule: 'SIDE_KILL',
    roleCounts: {
      WOLF: 4,
      VILLAGER: 4,
      SEER: 1,
      WITCH: 1,
      HUNTER: 1,
      GUARD: 1
    }
  }
}

export const getStandardPreset = (
  playerCount: number
): StandardPreset | null => {
  return STANDARD_PRESETS[playerCount] ?? null
}
