# 前端技术栈

## 1. 目标与职责

前端负责：

- 根据服务端阶段渲染页面
- 接收玩家输入并发送动作事件
- 展示个人可见信息（角色、操作提示、投票界面）
- 展示公共信息（阶段、死亡通报、投票结果、游戏结束）
- 提供全局帮助按钮与帮助 Modal

## 2. 推荐栈

| 类别 | 方案 | 状态 | 说明 |
|------|------|------|------|
| 框架 | `React + TypeScript` | 已定 | 页面组件化与类型约束 |
| 样式 | `Tailwind CSS` | 已定 | 便于快速迭代移动端样式 |
| 组件库 | `shadcn/ui` | 已定 | 标准化表单、Modal、按钮等组件 |
| 视觉系统 | `retro.md` | 已定 | 统一遵循 [Retro 设计规范](./retro.md) |
| 实时通信 | 浏览器 `WebSocket` | 已定 | 与服务端事件双向同步 |

## 3. 建议补充库（保持精简）

| 类别 | 库 | 是否建议首版引入 | 说明 |
|------|------|------|------|
| UI 状态管理 | `zustand` | 建议 | 管理 Modal、本地选择态、提示态等轻量状态 |
| 表单与校验 | `react-hook-form` + `zod` | 建议 | 昵称输入、房间加入等表单更稳 |
| 样式工具 | `clsx` + `tailwind-merge` + `class-variance-authority` | 建议 | 与 shadcn/ui 常用组合一致 |
| 图标 | `lucide-react` | 建议 | 轻量图标，便于统一帮助/状态图标 |
| 反馈提示 | `sonner` | 可选 | 断线、重连、提交成功等 Toast 反馈 |
| 动画 | `framer-motion` | 首版不建议 | 首版以稳定和清晰流程为先 |

## 4. 页面分层建议

```text
client/src/
  pages/                 # 阶段页面（join/lobby/night/day/end）
  components/
    common/              # Button/Modal/Badge 等基础组件
    game/                # PlayerGrid/RoleCard/VotePanel 等游戏组件
  hooks/
    useGameState         # 阶段态与派生 UI 状态
    useSocket            # WS 连接、重连、收发事件
  store/                 # 轻量状态容器（可选）
  types/                 # 前后端共享或前端专属类型
```

## 5. UI 约束（与产品文档一致）

- 手机竖版优先，关键操作按钮保持单手可点
- 游戏进行中右上角常驻 `❓帮助` 按钮
- 帮助 Modal 只展示摘要，不打断当前游戏阶段
- 所有“不可操作状态”需明确置灰与文案提示
- 复古风格实现必须符合 [retro.md](./retro.md) 的颜色、边框、字体、交互约束

## 6. 状态管理策略

- 服务端驱动：核心游戏状态以服务端消息为准
- 前端本地状态仅用于：
  - 当前页面 UI 交互态（选择中、Modal 开关）
  - 短时展示信息（提示文案、动画状态）
- 避免在前端推导胜负或规则结果

## 7. 首版实现建议

1. 先落地：`Tailwind + shadcn/ui + zustand + zod`
2. 保持轻量：动画库暂不引入，先用 CSS 完成必要过渡
3. 头像资源按产品文档内置 12 套，避免外部依赖

---

> 相关文档：
> - [技术栈总览](./01-tech-stack-overview.md)
> - [界面设计](../product/08-ui-design.md)

## 8. Realtime Session Persistence

- Client persists JoinResponse fields (roomId, playerId, sessionToken, isHost) in sessionStorage.
- On page refresh, client restores the saved session and reconnects WebSocket automatically.
- localStorage is intentionally avoided to prevent session collision across same-origin multi-tab testing.
- If server returns UNAUTHORIZED, client clears persisted session and falls back to re-join flow.
- Local multi-player testing can use one browser with multiple tabs because each tab has isolated sessionStorage.