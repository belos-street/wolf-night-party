export const CLIENT_WS_EVENTS = {
  gameStart: 'game:start',
  playerConfirmRole: 'player:confirm_role',
  playerLeave: 'player:leave',
  nightSubmitKill: 'night:submit_kill',
  nightSubmitSeer: 'night:submit_seer',
  nightSubmitGuard: 'night:submit_guard',
  nightSubmitWitch: 'night:submit_witch',
  daySubmitVote: 'day:submit_vote',
  daySubmitHunter: 'day:submit_hunter',
  uiRequestHelp: 'ui:request_help'
} as const

export const SERVER_WS_EVENTS = {
  gameSnapshot: 'game:snapshot',
  gamePlayerJoined: 'game:player_joined',
  gamePlayerLeft: 'game:player_left',
  gameRoleAssigned: 'game:role_assigned',
  gamePhaseChange: 'game:phase_change',
  gameNightAction: 'game:night_action',
  gameDayReveal: 'game:day_reveal',
  gameHunterSkill: 'game:hunter_skill',
  gameVoteResult: 'game:vote_result',
  gameDisconnect: 'game:disconnect',
  gameReconnect: 'game:reconnect',
  gameOver: 'game:game_over',
  gameError: 'game:error'
} as const

export type ClientWsEvent =
  (typeof CLIENT_WS_EVENTS)[keyof typeof CLIENT_WS_EVENTS]

export type ServerWsEvent =
  (typeof SERVER_WS_EVENTS)[keyof typeof SERVER_WS_EVENTS]
