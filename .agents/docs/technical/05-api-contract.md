# API 契约（HTTP + WebSocket）

## 1. 目标与范围

本文件定义首版联调契约：

- HTTP 只负责入场与健康检查
- WebSocket 负责全部对局内实时行为
- 服务端状态机权威，客户端只提交意图

## 2. 通用约定

### 2.1 协议与版本

- HTTP 基础路径：`/api`
- WebSocket 路径：`/ws`
- 首版不做显式版本前缀（后续可升级为 `/api/v1`）

### 2.2 会话与身份

- 玩家通过 `POST /api/join` 获取 `sessionToken`
- 客户端建立 WS 时携带 `sessionToken`（query 或 header）
- 断线重连使用同一 `sessionToken`

### 2.3 错误响应结构

```json
{
  "ok": false,
  "error": {
    "code": "PHASE_MISMATCH",
    "message": "当前阶段不允许该操作",
    "retryable": false
  }
}
```

## 3. HTTP 接口

### 3.1 `GET /api/health`

- 用途：健康检查与局域网可达性验证
- 响应：

```json
{
  "ok": true,
  "data": {
    "service": "wolf-night-party",
    "status": "up"
  }
}
```

### 3.2 `POST /api/join`

- 用途：玩家加入房间（游戏开始后拒绝新加入）
- 请求：

```json
{
  "nickname": "Alice",
  "avatarId": "avatar_01"
}
```

- 响应：

```json
{
  "ok": true,
  "data": {
    "roomId": "room_local",
    "playerId": "p_001",
    "sessionToken": "xxxxxx",
    "isHost": true
  }
}
```

- 典型错误码：
  - `GAME_ALREADY_STARTED`
  - `PLAYER_LIMIT_EXCEEDED`
  - `NICKNAME_INVALID`

## 4. WebSocket 事件信封

### 4.1 客户端 -> 服务端

```json
{
  "event": "day:submit_vote",
  "requestId": "req_123",
  "payload": {}
}
```

### 4.2 服务端 -> 客户端

```json
{
  "event": "game:vote_result",
  "payload": {},
  "ts": 1714123456789
}
```

## 5. 客户端 -> 服务端事件

| 事件名 | 说明 | payload |
|------|------|------|
| `game:start` | 主机开始游戏（6-12 人） | `{}` |
| `player:confirm_role` | 玩家确认已查看角色 | `{}` |
| `player:leave` | 玩家主动离开（等待阶段） | `{}` |
| `night:submit_kill` | 狼人提交刀人 | `{ "targetId": "p_xxx" }` |
| `night:submit_seer` | 预言家提交查验 | `{ "targetId": "p_xxx" }` |
| `night:submit_guard` | 守卫提交守护 | `{ "targetId": "p_xxx" }` |
| `night:submit_witch` | 女巫提交用药 | `{ "action": "save|poison|skip", "targetId": "p_xxx?" }` |
| `day:submit_vote` | 白天提交投票 | `{ "targetId": "p_xxx|abstain" }` |
| `day:submit_hunter` | 猎人提交开枪 | `{ "targetId": "p_xxx" }` |
| `ui:request_help` | 请求帮助摘要（可选） | `{}` |

## 6. 服务端 -> 客户端事件

| 事件名 | 说明 | payload |
|------|------|------|
| `game:snapshot` | 全量快照（初连/重连） | `GameSnapshot` |
| `game:player_joined` | 玩家加入 | `{ "player": PlayerPublic }` |
| `game:player_left` | 玩家离开 | `{ "playerId": "p_xxx" }` |
| `game:role_assigned` | 私发角色信息 | `{ "role": "SEER", "description": "..." }` |
| `game:phase_change` | 阶段切换 | `{ "phase": "NIGHT_WOLF", "deadlineMs": 0 }` |
| `game:night_action` | 私发操作提示 | `{ "action": "SEER_CHECK", "targets": [] }` |
| `game:day_reveal` | 白天死亡通报 | `{ "deaths": [] }` |
| `game:hunter_skill` | 猎人开枪提示 | `{ "canShoot": true }` |
| `game:vote_result` | 投票结果 | `{ "eliminatedId": "p_xxx", "isTie": false }` |
| `game:disconnect` | 玩家断线公告 | `{ "playerId": "p_xxx", "countdownSec": 120 }` |
| `game:reconnect` | 玩家重连公告 | `{ "playerId": "p_xxx" }` |
| `game:game_over` | 游戏结束 | `{ "winner": "GOOD", "roles": [] }` |
| `game:error` | 错误事件 | `{ "code": "...", "message": "..." }` |

## 7. 处理原则

1. 客户端事件必须做阶段校验、身份校验、存活校验。
2. 同一玩家同阶段重复提交按幂等处理（覆盖或忽略，需统一实现）。
3. 公共信息广播，角色私密信息只私发。
4. 操作超时按默认策略推进（见 [状态机技术规范](./07-state-machine-spec.md)）。

---

> 相关文档：
> - [状态机技术规范](./07-state-machine-spec.md)
> - [错误码与恢复策略](./08-error-codes-recovery.md)
