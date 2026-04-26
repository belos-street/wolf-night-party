# 狼人杀 - 技术文档索引

> 本目录用于承接“产品设计”到“工程实现”之间的技术落地说明。先从技术栈文档开始，后续再补充接口、数据模型、测试与发布文档。

## 文档列表

| 序号 | 文档 | 说明 |
|------|------|------|
| 1 | [技术栈总览](./01-tech-stack-overview.md) | 全栈技术选型、已定项与补充建议 |
| 2 | [后端技术栈](./02-backend-stack.md) | Node.js/Fastify/WebSocket/状态机后端方案 |
| 3 | [前端技术栈](./03-frontend-stack.md) | React 客户端、UI 方案、状态管理策略 |
| 4 | [运行与部署栈](./04-runtime-deployment-stack.md) | Termux 运行、局域网联机、开发/部署流程 |
| 5 | [API 契约](./05-api-contract.md) | HTTP/WS 事件协议、消息结构与处理原则 |
| 6 | [领域模型](./06-domain-models.md) | Room/Player/Action/Vote 等核心数据结构 |
| 7 | [状态机技术规范](./07-state-machine-spec.md) | 状态迁移、守卫条件、结算顺序、超时策略 |
| 8 | [错误码与恢复策略](./08-error-codes-recovery.md) | 错误码体系、重连恢复、前端提示策略 |
| 9 | [测试策略](./09-testing-strategy.md) | 单测/集成测试范围、覆盖门槛、回归清单 |
| 10 | [工程约定](./10-engineering-conventions.md) | 命名、脚本、质量工具与协作规范 |
| 11 | [Retro 视觉规范](./retro.md) | 前端视觉风格唯一参考基线（90s 复古） |

## 阅读建议

- 先看 [技术栈总览](./01-tech-stack-overview.md) 确认方向
- 再看后端/前端子文档确认实现边界
- 最后看运行部署文档确认可执行性

---

> 相关产品文档：
> - [系统架构](../product/02-system-architecture.md)
> - [状态机与事件](../product/06-state-machine-events.md)
