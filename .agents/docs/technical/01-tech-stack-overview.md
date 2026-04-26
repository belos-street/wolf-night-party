# 技术栈总览

## 1. 目标

为“本地线下联机狼人杀（6-12人）”提供一套可在手机 Termux 上稳定运行、并支持浏览器实时交互的技术栈方案。

## 2. 技术栈分层

| 层级 | 方案 | 状态 | 说明 |
|------|------|------|------|
| 运行环境 | `Node.js >= 24` + `Termux` | 已定 | 统一以 Node 24+ 为最低版本（推荐 24.x LTS） |
| 后端语言 | `TypeScript` | 已定 | 提升状态机与事件协议的类型安全 |
| 后端框架 | `Fastify` + `@fastify/websocket`（基于 `ws`） | 已定 | 标准模式不引入 Socket.IO，降低复杂度与依赖 |
| 前端框架 | `React` + `TypeScript` | 已定 | 组件化开发，与状态驱动页面匹配 |
| 通信协议 | `HTTP + WebSocket` | 已定 | HTTP 加入游戏，WS 处理实时流程 |
| 存储策略 | `纯内存` | 已定 | 单局即时玩法，不做持久化 |
| 状态推进 | `服务端状态机` | 已定 | 服务端作为“上帝”，客户端只做渲染与输入 |
| UI 样式 | `Tailwind CSS + shadcn/ui` | 已定 | 组件层统一，便于快速迭代 |
| 视觉规范 | `retro.md` | 已定 | 统一遵循 [.agents/docs/technical/retro.md](./retro.md) |

## 3. 已与产品文档对齐的关键约束

- 标准模式仅支持 `6-12` 人
- 角色配置由服务端按人数自动套用，主机只读
- 对局中主机不可强制重开
- 游戏进行中所有页面可打开“帮助”Modal

## 4. 选型原则

- 移动优先：交互以手机竖版为第一目标
- 本地优先：不依赖公网、数据库或第三方托管
- 状态一致性优先：所有关键规则由服务端单点裁定
- 简化运维：减少组件数量，降低 Termux 运行复杂度

## 5. 本轮确认结论（2026-04-26）

1. WebSocket 标准实现采用 `@fastify/websocket + ws`，首版不使用 Socket.IO
2. Node.js 最低版本固定为 `24+`（推荐 24.x LTS）
3. 前端确认采用 `Tailwind CSS + shadcn/ui`
4. 视觉风格统一遵循 [retro.md](./retro.md)

## 6. 技术栈补充建议

1. 质量保障：`ESLint + Prettier + node:test + c8`（后端先沿用 Fastify 脚手架内置测试体系）
2. 协议校验：`zod`（统一校验 HTTP/WS 入参，减少脏数据进入状态机）
3. 前端状态管理：`zustand`（仅管理 UI 层临时状态，不接管服务端权威状态）
4. UI 辅助库：`clsx + tailwind-merge + class-variance-authority`（与 shadcn/ui 生态一致）
5. 反馈组件：`sonner`（提示加入失败、断线重连、阶段切换等轻量反馈）

---

> 相关文档：
> - [系统架构](../product/02-system-architecture.md)
> - [状态机与事件](../product/06-state-machine-events.md)
