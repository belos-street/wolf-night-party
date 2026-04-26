# 领域模型与数据结构

## 1. 目标

统一服务端核心对象结构，确保：

- 状态机可稳定推进
- 协议层字段命名一致
- 前后端共享类型边界清晰

## 2. 核心枚举

```ts
type Team = 'GOOD' | 'WOLF'
type VictoryRule = 'MASSACRE' | 'SIDE_KILL'

type RoleKind =
  | 'VILLAGER'
  | 'WOLF'
  | 'SEER'
  | 'WITCH'
  | 'HUNTER'
  | 'GUARD'
  | 'IDIOT'

type ConnectionState = 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING'
type DeathCause = 'WOLF_KILL' | 'VOTE_OUT' | 'WITCH_POISON' | 'HUNTER_SHOT' | 'DISCONNECT_TIMEOUT'
```

## 3. 玩家模型

```ts
interface PlayerState {
  id: string
  nickname: string
  avatarId: string
  seatNo: number
  isHost: boolean
  role: RoleKind
  team: Team
  alive: boolean
  canVote: boolean // 白痴翻牌后为 false
  connection: ConnectionState
  sessionTokenHash: string
}
```

## 4. 房间与对局模型

```ts
interface RoomConfig {
  playerCount: number // 6-12
  victoryRule: VictoryRule
  presetId: string
}

interface RoomState {
  roomId: string
  status: 'WAITING' | 'RUNNING' | 'ENDED'
  round: number
  phase: string
  players: PlayerState[]
  config: RoomConfig
  deadPlayers: DeathRecord[]
  createdAt: number
  updatedAt: number
}
```

## 5. 夜晚与投票子模型

```ts
interface NightActionState {
  wolfTargetId?: string
  seerTargetId?: string
  guardTargetId?: string
  witchAction: 'SAVE' | 'POISON' | 'SKIP'
  witchTargetId?: string
}

interface VoteBallot {
  voterId: string
  targetId: string | 'abstain'
}

interface VoteRoundState {
  roundNo: 1 | 2
  candidateIds: string[] // 重投时仅平票候选
  ballots: VoteBallot[]
  isTie: boolean
}
```

## 6. 结算与历史

```ts
interface DeathRecord {
  playerId: string
  cause: DeathCause
  atPhase: string
  canLastWords: boolean
  revealedRole: RoleKind
}

interface GameResult {
  winner: Team
  reason: string
  endedAt: number
  revealRoles: Array<{ playerId: string; role: RoleKind }>
}
```

## 7. 模型边界

1. `RoomState`、`PlayerState` 仅服务端可写。
2. 客户端接收 `PlayerPublic`（隐藏他人身份）。
3. 私密字段（如角色、药量）按玩家私发，不进入公共广播。
4. 所有模型变更必须经状态机调度入口，不允许在 WS handler 中直接改状态。

## 8. 共享类型建议

- 放置目录：`server/src/shared/types` 与 `client/src/types`
- 方式：首版可复制维护；第二阶段可抽 `packages/shared-types`

---

> 相关文档：
> - [API 契约](./05-api-contract.md)
> - [状态机技术规范](./07-state-machine-spec.md)
