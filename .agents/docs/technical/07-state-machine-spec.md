# 状态机技术规范

## 1. 目标

把产品流程转成可实现的“状态 + 迁移 + 守卫条件”规范，确保服务端单点裁定。

## 2. 顶层状态

| 状态 | 含义 |
|------|------|
| `WAITING` | 等待加入 |
| `ROLE_ASSIGNMENT` | 分配角色 |
| `ROLE_VIEW` | 查看角色 |
| `NIGHT_*` | 夜晚子阶段 |
| `DAY_*` | 白天子阶段 |
| `ENDED` | 对局结束 |

## 3. 状态迁移主链

1. `WAITING -> ROLE_ASSIGNMENT -> ROLE_VIEW -> NIGHT_WOLF`
2. 夜晚链路：`NIGHT_WOLF -> NIGHT_SEER -> NIGHT_GUARD -> NIGHT_WITCH -> NIGHT_RESOLVE`
3. 白天链路：`DAY_REVEAL -> (DAY_HUNTER_NIGHT?) -> DAY_LAST_WORDS -> DAY_DISCUSSION -> DAY_VOTE -> (DAY_REVOTE?) -> DAY_VOTE_RESULT -> (DAY_IDIOT_REVEAL | DAY_HUNTER_VOTE | NIGHT_WOLF)`
4. 任意结算点满足胜利条件则 `-> ENDED`

## 4. 关键守卫条件（Guards）

### 4.1 `game:start`

- 仅主机可触发
- 人数必须在 `6-12`
- 标准预设已锁定

### 4.2 夜晚动作提交

- 必须匹配当前子阶段（例如 `NIGHT_SEER` 仅允许预言家提交）
- 玩家必须存活且在线
- 同阶段重复提交按幂等处理

### 4.3 投票提交

- 必须在 `DAY_VOTE` 或 `DAY_REVOTE`
- 玩家必须 `alive = true` 且 `canVote = true`
- 第二轮重投仅允许投给平票候选或弃票

## 5. 结算顺序

### 5.1 夜晚结算（固定顺序）

1. 读取狼人刀人目标
2. 应用守卫守护
3. 应用女巫解药（若刀已被守，解药不消耗）
4. 应用女巫毒药
5. 生成死亡清单并写入 `DeathRecord`
6. 触发胜利检测

### 5.2 白天结算（固定顺序）

1. 公布夜晚死亡
2. 若猎人死于狼刀，先触发 `DAY_HUNTER_NIGHT`
3. 进入遗言和讨论
4. 执行首轮投票，必要时执行一次重投
5. 处理放逐目标：
   - 猎人：触发 `DAY_HUNTER_VOTE`
   - 白痴：翻牌存活，`canVote = false`
   - 其他：直接死亡
6. 触发胜利检测

## 6. 超时策略（首版建议）

| 阶段 | 默认超时行为 |
|------|------|
| `NIGHT_WOLF` | 超时随机/首个候选（实现时二选一并固定） |
| `NIGHT_SEER` | 视为 `skip` |
| `NIGHT_GUARD` | 视为 `skip` |
| `NIGHT_WITCH` | 视为 `skip` |
| `DAY_VOTE` | 视为 `abstain` |
| `DAY_HUNTER_*` | 视为不开枪 |

> 注：讨论阶段默认不强制计时（与产品文档一致）。

## 7. 胜利检测挂载点

1. `NIGHT_RESOLVE` 完成后
2. 猎人开枪后（两种触发场景都要覆盖）
3. 投票放逐结算后
4. 断线超时判死后
5. 女巫毒药导致死亡后

## 8. 实现建议

1. 使用单入口 `dispatch(event)` 推进状态。
2. 每次状态变更后记录结构化日志（前态、事件、后态）。
3. 广播与状态更新分离：先改状态，再按新状态发事件。

---

> 相关文档：
> - [游戏流程](../product/03-game-flow.md)
> - [状态机与事件](../product/06-state-machine-events.md)
