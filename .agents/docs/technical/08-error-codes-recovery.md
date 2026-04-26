# 错误码与恢复策略

## 1. 目标

统一错误处理与断线恢复，避免前后端提示不一致和流程卡死。

## 2. 错误码设计

### 2.1 通用业务错误

| 错误码 | 含义 | 前端建议文案 |
|------|------|------|
| `UNAUTHORIZED` | 会话无效 | 会话失效，请重新加入 |
| `FORBIDDEN` | 无权限操作 | 当前操作仅限特定玩家 |
| `BAD_REQUEST` | 参数错误 | 请求参数错误，请重试 |
| `INTERNAL_ERROR` | 服务异常 | 服务器异常，请稍后重试 |

### 2.2 对局流程错误

| 错误码 | 含义 | 恢复动作 |
|------|------|------|
| `GAME_ALREADY_STARTED` | 游戏已开始，拒绝新加入 | 返回大厅提示页 |
| `PLAYER_LIMIT_EXCEEDED` | 人数超限 | 阻止加入 |
| `PHASE_MISMATCH` | 当前阶段不允许该操作 | 刷新当前阶段 UI |
| `NOT_YOUR_TURN` | 非当前角色行动阶段 | 保持只读 |
| `PLAYER_DEAD` | 死亡玩家不能操作 | 显示观战态 |
| `ACTION_ALREADY_SUBMITTED` | 重复提交 | 前端保持提交成功态 |
| `INVALID_TARGET` | 目标不合法 | 保持面板并提示重新选择 |
| `HOST_ONLY_ACTION` | 仅主机可操作 | 禁止按钮 |

### 2.3 连接与恢复错误

| 错误码 | 含义 | 恢复动作 |
|------|------|------|
| `DISCONNECTED` | 连接断开 | 启动自动重连 |
| `RECONNECT_TIMEOUT` | 重连超时 | 玩家判死并广播 |
| `SERVER_SHUTDOWN` | 主机服务退出 | 提示整局结束，返回首页 |

## 3. 断线恢复流程

1. 游戏进行中断线：进入全局暂停 + 120 秒倒计时。
2. 倒计时内重连成功：发送 `game:snapshot`，恢复原阶段。
3. 倒计时超时：玩家死亡，公开身份，执行胜利检测后继续或结束。
4. 等待阶段断线：不计时，可随时重连。

## 4. 客户端重连策略（建议）

1. WS 断开后立即重连，间隔：`1s -> 2s -> 3s -> 5s`（上限 5s）。
2. 重连成功后请求/接收全量快照，不依赖本地旧状态恢复。
3. 连续失败直到服务端给出超时判定或玩家主动返回首页。

## 5. 错误返回约定

### 5.1 HTTP

```json
{
  "ok": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "nickname is required",
    "retryable": true
  }
}
```

### 5.2 WebSocket

```json
{
  "event": "game:error",
  "payload": {
    "code": "PHASE_MISMATCH",
    "message": "当前阶段不允许投票"
  }
}
```

## 6. 前端落地建议

1. 全局错误分层：`toast`（轻提示）+ `modal`（阻断型错误）。
2. 错误文案优先中文友好描述，不直接展示技术细节。
3. 所有 `retryable=true` 错误提供“重试”入口。

---

> 相关文档：
> - [断线与异常处理](../product/07-disconnect-exception.md)
> - [API 契约](./05-api-contract.md)
