export const GAME_PHASES = {
  waiting: 'WAITING',
  roleAssignment: 'ROLE_ASSIGNMENT',
  roleView: 'ROLE_VIEW',
  nightWolf: 'NIGHT_WOLF',
  nightSeer: 'NIGHT_SEER',
  nightGuard: 'NIGHT_GUARD',
  nightWitch: 'NIGHT_WITCH',
  nightResolve: 'NIGHT_RESOLVE',
  dayReveal: 'DAY_REVEAL',
  dayHunterNight: 'DAY_HUNTER_NIGHT',
  dayLastWords: 'DAY_LAST_WORDS',
  dayDiscussion: 'DAY_DISCUSSION',
  dayVote: 'DAY_VOTE',
  dayRevote: 'DAY_REVOTE',
  dayVoteResult: 'DAY_VOTE_RESULT',
  dayIdiotReveal: 'DAY_IDIOT_REVEAL',
  dayHunterVote: 'DAY_HUNTER_VOTE',
  ended: 'ENDED'
} as const

export type GamePhase = (typeof GAME_PHASES)[keyof typeof GAME_PHASES]
