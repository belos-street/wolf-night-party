# 狼人杀 - 本地联机版 状态机与事件

## 1. 游戏状态机

### 1.1 状态枚举

| 状态 | 说明 | 触发条件 | 下一状态 |
|------|------|---------|---------|
| `WAITING` | 等待玩家加入 | 服务器启动 | `ROLE_ASSIGNMENT` |
| `ROLE_ASSIGNMENT` | 角色分配 | 主机点击开始游戏 | `ROLE_VIEW` |
| `ROLE_VIEW` | 玩家查看角色 | 角色分配完成 | `NIGHT_WOLF`（自动） |
| `NIGHT_WOLF` | 狼人刀人 | 进入夜晚阶段 | `NIGHT_SEER` |
| `NIGHT_SEER` | 预言家查验 | 狼人刀人完成 | `NIGHT_GUARD` |
| `NIGHT_GUARD` | 守卫守护 | 预言家查验完成 | `NIGHT_WITCH` |
| `NIGHT_WITCH` | 女巫用药 | 守卫守护完成 | `NIGHT_RESOLVE` |
| `NIGHT_RESOLVE` | 夜晚结算 | 女巫用药完成 | `DAY_REVEAL` 或 `ENDED` |
| `DAY_REVEAL` | 死亡通报 | 太阳升起 | `DAY_HUNTER_NIGHT` 或 `DAY_LAST_WORDS` |
| `DAY_HUNTER_NIGHT` | 猎人开枪（狼刀触发） | 猎人死于狼刀 | `DAY_LAST_WORDS` 或 `ENDED` |
| `DAY_LAST_WORDS` | 遗言阶段 | 死亡通报/猎人开枪后 | `DAY_DISCUSSION` |
| `DAY_DISCUSSION` | 自由讨论 | 遗言发表完成 | `DAY_VOTE` |
| `DAY_VOTE` | 首轮投票 | 讨论结束 | `DAY_REVOTE` 或 `DAY_VOTE_RESULT` |
| `DAY_REVOTE` | 平票重投 | 首轮投票平票 | `DAY_VOTE_RESULT` |
| `DAY_VOTE_RESULT` | 投票结算 | 投票完成 | `DAY_IDIOT_REVEAL` 或 `DAY_HUNTER_VOTE` 或 `NIGHT_WOLF` 或 `ENDED` |
| `DAY_IDIOT_REVEAL` | 白痴翻牌 | 被放逐的是白痴 | `NIGHT_WOLF` |
| `DAY_HUNTER_VOTE` | 猎人开枪（投票触发） | 被放逐的是猎人 | `NIGHT_WOLF` 或 `ENDED` |
| `ENDED` | 游戏结束 | 胜利条件满足 | `WAITING` |

### 1.2 状态流转规则

1. **线性流转**: 大部分状态按固定顺序流转
2. **条件分支**: 
   - `DAY_REVEAL` → 若有猎人死于狼刀 → `DAY_HUNTER_NIGHT` → `DAY_LAST_WORDS`
   - `DAY_REVEAL` → 若无猎人死于狼刀 → `DAY_LAST_WORDS`
   - `DAY_VOTE` → 若平票 → `DAY_REVOTE` → `DAY_VOTE_RESULT`
   - `DAY_VOTE_RESULT` → 若被放逐的是白痴 → `DAY_IDIOT_REVEAL` → `NIGHT_WOLF`
   - `DAY_VOTE_RESULT` → 若被放逐的是猎人 → `DAY_HUNTER_VOTE` → 检测胜利条件
   - `DAY_VOTE_RESULT` → 若被放逐的是其他角色 → 检测胜利条件
3. **胜利检测**: 每次状态流转后，系统自动检测胜利条件，若满足则跳转到 `ENDED`
4. **断线处理**: 任何状态下发生断线，进入断线倒计时，倒计时结束后根据情况继续或判死

### 1.3 状态定义（代码参考）

```
GamePhase:
  - WAITING          // 等待玩家加入
  - ROLE_ASSIGNMENT  // 角色分配
  - ROLE_VIEW        // 查看角色
  - NIGHT            // 夜晚
  - DAY              // 白天
  - ENDED            // 游戏结束

NightPhase:
  - NONE             // 无
  - WOLF_ACTION      // 狼人刀人
  - SEER_ACTION      // 预言家查验
  - GUARD_ACTION     // 守卫守护
  - WITCH_ACTION     // 女巫用药
  - NIGHT_RESOLVE    // 夜晚结算
  - NIGHT_END        // 夜晚结束

DayPhase:
  - NONE             // 无
  - DEATH_REVEAL     // 死亡通报
  - HUNTER_SKILL     // 猎人开枪（狼刀/投票触发）
  - LAST_WORDS       // 遗言
  - DISCUSSION       // 自由讨论
  - VOTE             // 投票
  - REVOTE           // 平票重投
  - VOTE_RESULT      // 投票结算
  - IDIOT_REVEAL     // 白痴翻牌
  - DAY_END          // 白天结束

ConnectionState:
  - CONNECTED        // 已连接
  - DISCONNECTED     // 已断开
  - RECONNECTING     // 重连中
```

## 2. WebSocket 事件规范

### 2.1 服务器 → 客户端事件

| 事件名 | 说明 | 数据格式 |
|--------|------|---------|
| `game:phase_change` | 游戏阶段变更 | `{ phase: string, data: any }` |
| `game:role_assigned` | 角色分配完成 | `{ role: string, description: string }` |
| `game:night_action` | 夜晚行动提示 | `{ action: string, targets: Player[] }` |
| `game:day_reveal` | 白天死亡通报 | `{ deaths: DeathRecord[] }` |
| `game:hunter_skill` | 猎人技能触发 | `{ canShoot: boolean }` |
| `game:vote_result` | 投票结果 | `{ result: VoteResult }` |
| `game:game_over` | 游戏结束 | `{ winner: string, roles: PlayerRole[] }` |
| `game:player_joined` | 新玩家加入 | `{ player: Player }` |
| `game:player_left` | 玩家离开 | `{ playerId: string }` |
| `game:disconnect` | 玩家断线 | `{ playerId: string, countdown: number }` |
| `game:reconnect` | 玩家重连 | `{ playerId: string }` |
| `game:error` | 错误提示 | `{ message: string, code: number }` |

### 2.2 客户端 → 服务器事件

> 初始加入使用 HTTP `POST /api/join`，成功后建立 WebSocket。以下为 WebSocket 事件。

| 事件名 | 说明 | 数据格式 |
|--------|------|---------|
| `player:leave` | 离开游戏 | `{ playerId: string }` |
| `player:confirm_role` | 确认角色 | `{ playerId: string }` |
| `night:submit_kill` | 狼人提交刀人 | `{ targetId: string }` |
| `night:submit_seer` | 预言家提交查验 | `{ targetId: string }` |
| `night:submit_witch` | 女巫提交用药 | `{ action: 'save' \| 'poison' \| 'skip', targetId?: string }` |
| `night:submit_guard` | 守卫提交守护 | `{ targetId: string }` |
| `day:submit_vote` | 提交投票 | `{ targetId: string \| 'abstain' }` |
| `day:submit_hunter` | 猎人提交开枪目标 | `{ targetId: string }` |
| `game:start` | 主机开始游戏 | `{ hostId: string }`（服务端校验人数必须为6-12，并自动加载对应标准预设） |

### 2.3 事件处理原则

1. **幂等性**: 同一事件多次发送，结果一致
2. **状态校验**: 服务器收到客户端事件时，校验当前游戏状态是否允许该操作
3. **广播机制**: 公共事件广播给所有玩家，私有事件（如角色分配）只发送给目标玩家
4. **超时处理**: 夜晚阶段操作超时后，服务器自动提交默认操作并继续流程
5. **配置锁定**: 标准模式下角色配置仅由服务端按人数映射（6-12人），客户端不允许改配

---

> **相关文档**:
> - [系统架构](./02-system-architecture.md)
> - [游戏流程](./03-game-flow.md)
