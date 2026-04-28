# Wolf Night Party TODO（产品/原型/技术对齐版）

> 更新时间：2026-04-26  
> 当前阶段：文档完成，进入工程实现前的任务拆解  
> 目标：按 `product + prototype + technical` 一致性推进首版可玩闭环

## 0. 范围与硬约束（P0）

- [ ] 标准模式仅支持 `6-12` 人
- [ ] 角色预设由服务端自动套用，开局后锁定，不可手调
- [ ] 服务端状态机权威，客户端仅渲染与提交意图
- [ ] 游戏中全局可打开 `❓帮助` Modal
- [ ] 手机竖版优先，风格遵循 `technical/retro.md`

依据：
- `product/03-game-flow.md`
- `product/04-role-design.md`
- `product/06-state-machine-events.md`
- `technical/01-tech-stack-overview.md`
- `technical/03-frontend-stack.md`

## M1. 工程基线（P0）

- [x] 根目录工作区脚本统一（`dev/build/lint/test`）
- [x] 确认包管理策略（推荐 `pnpm workspace` + 根锁文件）
- [x] `client` 初始化校验（Vite + React + TS）
- [x] `server` 初始化校验（Fastify + ESM + TS）
- [x] 脚本命令统一为 `pnpm run`（移除 `npm run` 混用）
- [x] 接入 `ESLint + Prettier`
- [x] 后端测试沿用 `node:test + c8`（Fastify 脚手架默认）
- [ ] 前端测试框架择机引入（建议 `Vitest + Testing Library`）
- [x] Node 版本基线固定为 `22.x`（最低 `22.13.0`）

完成标准：
- [x] `pnpm -r build` 可通过
- [x] `pnpm -r lint` 可通过
- [x] `pnpm -r test` 至少跑通基础样例
- [x] 根目录一键安装可执行（`pnpm install`）
- [ ] 根目录一键开发可执行（`pnpm -r dev`）

依据：
- `technical/01-tech-stack-overview.md`
- `technical/04-runtime-deployment-stack.md`
- `technical/10-engineering-conventions.md`

## M2. 协议与共享模型（P0）

- [x] 落地 HTTP 契约：`GET /api/health`、`POST /api/join`
- [x] 落地 WS 事件信封结构（`event/requestId/payload`）
- [x] 统一事件名常量（client/server 共识）
- [x] 建立核心领域类型：`Room/Player/Vote/DeathRecord`
- [x] 为 HTTP/WS 入参建立 `zod` 校验

完成标准：
- [x] 关键接口类型与字段和文档一致
- [x] 非法 payload 会被拒绝并返回标准错误结构

依据：
- `technical/05-api-contract.md`
- `technical/06-domain-models.md`
- `technical/08-error-codes-recovery.md`

## M3. 后端状态机与规则引擎（P0）

- [x] 实现房间生命周期：等待/进行中/结束
- [x] 实现标准预设映射（6-12）
- [x] 实现角色分配与私发
- [x] 实现夜晚结算链路（狼/预言家/守卫/女巫/结算）
- [x] 实现白天链路（通报/猎人/遗言/投票/重投/白痴）
- [x] 实现胜利检测（6-9 屠城，10-12 屠边）
- [x] 实现超时默认动作

完成标准：
- [x] 状态迁移与文档主链一致
- [x] 至少 1 条完整对局流程在服务端可自洽推进

依据：
- `product/03-game-flow.md`
- `product/04-role-design.md`
- `product/05-victory-conditions.md`
- `technical/07-state-machine-spec.md`

## M4. 实时通信与连接恢复（P0）

- [x] WS 鉴权（`sessionToken`）
- [x] 公共广播与私有消息分流
- [x] 断线公告与 120 秒倒计时机制
- [x] 重连后 `snapshot` 恢复
- [x] 心跳与超时回收（ping/pong）

完成标准：
- [x] 断线重连后玩家可回到正确阶段
- [x] 超时未重连按规则判死并继续流程

依据：
- `product/07-disconnect-exception.md`
- `technical/05-api-contract.md`
- `technical/08-error-codes-recovery.md`

## M5. 前端主流程页面（P0）

- [x] Join/Lobby/Role 页面接入真实数据
- [x] Night/Day/End/Disconnect 页面接入真实状态
- [x] 主机页面只读预设与开始按钮约束
- [x] 全局帮助按钮 + Modal（规则摘要/职业说明）
- [x] 不可操作态禁用与提示文案统一

完成标准：
- [x] 页面流与原型顺序一致
- [x] 核心交互（加入、投票、技能提交）全链可点通

依据：
- `prototype/scripts/pages/*.js`
- `product/08-ui-design.md`
- `technical/03-frontend-stack.md`
- `technical/retro.md`

## M6. 联调、测试与验收（P0）

- [x] 后端规则单测覆盖关键分支
- [x] HTTP + WS 集成测试跑通主路径
- [x] 手工回归 6 人局与 12 人局
- [x] 手工回归分支：平票重投、白痴翻牌、猎人双触发
- [x] 手工回归异常：断线重连、断线判死、超时默认动作

完成标准：
- [x] 无阻断级流程错误
- [x] 关键测试脚本可重复执行

依据：
- `technical/09-testing-strategy.md`
- `product/03-game-flow.md`
- `product/07-disconnect-exception.md`

## M7. 文档与发版准备（P1）

- [ ] 更新 README：本地启动、热点联机步骤
- [ ] 补充常见问题：无法加入、断线、端口占用
- [ ] 文档反向校对：实现与技术文档保持一致
- [ ] 标记首版未实现项（明确后续范围）

完成标准：
- [ ] 新同学按文档可完成本地启动并跑一局

依据：
- `technical/04-runtime-deployment-stack.md`
- `technical/10-engineering-conventions.md`

## 里程碑建议顺序

1. `M1 -> M2 -> M3`
2. `M4 -> M5`
3. `M6 -> M7`

## 风险清单（当前）

- [ ] 规则细节冲突风险（产品规则与实现偏差）
- [ ] 事件命名漂移风险（前后端常量不一致）
- [ ] 断线恢复复杂度风险（状态回放与快照一致性）
- [ ] 复古样式落地风险（组件库默认样式与 retro 规范冲突）
