# Agents Configuration

> 本文件用于约束大模型的理解范围和工作方式，确保大模型在正确的上下文中工作。

## 项目概述

**项目名称**: 狼人杀 - 本地联机版
**技术栈**: React + TypeScript + Fastify + WebSocket
**架构模式**: 客户端-服务器模式 (C/S)
**运行平台**: 移动端（Termux）+ 局域网联机

---

## 1. Skills 技能说明

### 1.1 belos-street - 个人编码规范

**作用**: 个人编码习惯与最佳实践的全面规范，定义项目的命名约定、代码组织、代码风格。

**何时使用**:
- 任何代码编写任务前必须加载
- 定义文件命名、组件命名、变量命名时
- 组织代码结构时
- 代码风格配置时

**约束规范**:
| 类型 | 风格 | 示例 |
|------|------|------|
| 文件/目录 | kebab-case | `user-profile.ts`, `api-helper/` |
| Vue/React 组件 | kebab-case | `user-profile.vue`, `product-card.tsx` |
| 函数/变量 | camelCase | `fetchUserData`, `isLoading` |
| 接口/类型 | PascalCase | `UserInfo`, `ApiResponse` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 布尔值 | is/has/can 前缀 | `isActive`, `hasPermission` |

**参考文件**:
- [naming-conventions.md](skills/belos-street/reference/naming-conventions.md)
- [code-organization.md](skills/belos-street/reference/code-organization.md)
- [code-style.md](skills/belos-street/reference/code-style.md)
- [testing-philosophy.md](skills/belos-street/reference/testing-philosophy.md)
- [llm-coding-guidelines.md](skills/belos-street/reference/llm-coding-guidelines.md)

---

### 1.2 react-best-practices - React 最佳实践

**作用**: React 19 开发指南，覆盖 Hooks、组件设计、性能优化、TypeScript 集成。

**何时使用**:
- 涉及 React 组件开发时必须加载
- 使用 .tsx 文件时必须加载
- 使用 React Router、Redux、Vite + React 时必须加载
- 进行状态管理、useEffect 编写、事件处理时

**核心主题**:
- State & Hooks (状态管理、Hooks 使用)
- useEffect (副作用、清理、依赖)
- Performance (性能优化、memo、useCallback)
- Components (组件设计、props、children)
- Context (上下文、避免 prop drilling)
- Custom Hooks (自定义 Hooks 规范)
- Refs (useRef 使用场景)
- Event Handlers (事件处理规范)
- TypeScript (类型最佳实践)
- Animation (动画实现)

**参考文件**: `skills/react-best-practices/reference/` 目录下 62 个参考文件

---

### 1.3 fastify-best-practices - Fastify 后端开发指南

**作用**: Fastify Node.js 后端服务器开发指南，包括 REST API、插件、验证、错误处理、WebSocket 等。

**何时使用**:
- 开发后端应用时必须加载
- 实现 Fastify 插件和路由处理器时
- 使用 TypeScript 与 Fastify 时
- 配置验证、序列化、错误处理时
- 实现 WebSocket 通信时
- 设置认证、CORS、安全头时

**核心规则文件**:
- `rules/plugins.md` - 插件开发与封装
- `rules/routes.md` - 路由组织与处理器
- `rules/schemas.md` - JSON Schema 验证
- `rules/websockets.md` - WebSocket 支持
- `rules/error-handling.md` - 错误处理模式
- `rules/testing.md` - 使用 inject() 测试
- `rules/typescript.md` - TypeScript 集成

---

### 1.4 brainstorming - 头脑风暴与设计探索

**作用**: 在进行任何创造性工作（创建功能、构建组件、添加功能、修改行为）前，必须使用的设计探索流程。

**何时使用** (HARD-GATE):
- 创建新功能时
- 构建新组件时
- 添加新功能时
- 修改现有行为时

**约束规范** (强制性要求):
1. **不写代码** - 在呈现设计并获得用户批准前，禁止调用任何实现技能、编写代码、搭建项目
2. **探索上下文** - 先检查项目文件、文档、最近提交
3. **逐个提问** - 一次只问一个问题
4. **提出 2-3 个方案** - 附带权衡和推荐
5. **呈现设计** - 获得用户批准后再实施
6. **文档化** - 保存到 `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`

**流程**: 探索上下文 → 提问澄清 → 方案建议 → 设计呈现 → 获得批准 → 编写设计文档 → 审查 → 过渡到 writing-plans

---

### 1.5 writing-plans - 实施方案编写

**作用**: 将设计规范转化为详细的分步实现计划。

**何时使用**:
- 完成 brainstorming 并获得设计批准后
- 有明确需求需要进行多步骤实现时

**约束规范**:
- 每个任务 2-5 分钟完成
- 包含完整的代码示例
- 包含具体的测试命令
- 文件路径必须精确
- 无占位符 (TODO、TBD 等)
- 频繁提交 (TDD、DRY、YAGNI)

**输出位置**: `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`

---

### 1.6 zustand - 状态管理

**作用**: React 状态管理解决方案，基于 hooks 的轻量级状态管理库。

**何时使用**:
- React 应用需要全局状态管理时
- 需要替代 Redux/Context 的更轻量方案时

**核心概念**:
- Store 定义与使用
- 状态与 Actions
- Middleware (devtools、persist)
- TypeScript 支持
- 选择器 (Selectors) 优化渲染

---

### 1.7 技能使用优先级

```
1. brainstorming (任何创造性工作前 - HARD-GATE)
2. belos-street (代码编写时持续参考)
3. react-best-practices (React 开发时)
4. fastify-best-practices (后端开发时)
5. writing-plans (brainstorming 完成后)
6. zustand (状态管理需要时)
```

---

## 2. Docs 文档说明

### 2.1 product/ - 产品设计文档

**作用**: 游戏产品需求、设计、规则的完整说明，定义游戏规则、流程、角色、胜利条件等核心内容。

**何时查阅**: 修改游戏规则、流程、角色配置、胜利条件、UI 设计时。

**文档列表**:

| 序号 | 文档 | 说明 |
|------|------|------|
| 1 | [01-game-overview.md](docs/product/01-game-overview.md) | 游戏定位、核心特点、连接流程、主机权限 |
| 2 | [02-system-architecture.md](docs/product/02-system-architecture.md) | 技术栈、客户端结构、通信方式、设计模式 |
| 3 | [03-game-flow.md](docs/product/03-game-flow.md) | 整体流程图、阶段详细说明、结算逻辑 |
| 4 | [04-role-design.md](docs/product/04-role-design.md) | 阵营划分、角色列表、配置表、详细规则 |
| 5 | [05-victory-conditions.md](docs/product/05-victory-conditions.md) | 好人/狼人胜利条件、检测时机、各人数局规则 |
| 6 | [06-state-machine-events.md](docs/product/06-state-machine-events.md) | 游戏状态机、状态流转规则、WebSocket 事件规范 |
| 7 | [07-disconnect-exception.md](docs/product/07-disconnect-exception.md) | 断线重连机制、主机异常处理、数据存储策略 |
| 8 | [08-ui-design.md](docs/product/08-ui-design.md) | 页面列表、页面原型、Modal 组件、主机面板设计 |

**使用建议**:
- 修改角色规则 → 查看 04-role-design.md
- 修改游戏流程 → 查看 03-game-flow.md + 06-state-machine-events.md
- 修改胜利条件 → 查看 05-victory-conditions.md
- 修改界面 → 查看 08-ui-design.md
- 修改网络相关 → 查看 07-disconnect-exception.md + 02-system-architecture.md

---

### 2.2 technical/ - 技术实现文档

**作用**: 产品设计到工程实现之间的技术落地说明，包括技术选型、API 契约、数据模型、测试策略等。

**何时查阅**: 进行工程实现、接口开发、数据建模、测试编写时。

**文档列表**:

| 序号 | 文档 | 说明 |
|------|------|------|
| 1 | [01-tech-stack-overview.md](docs/technical/01-tech-stack-overview.md) | 全栈技术选型、已定项与补充建议 |
| 2 | [02-backend-stack.md](docs/technical/02-backend-stack.md) | Node.js/Fastify/WebSocket/状态机后端方案 |
| 3 | [03-frontend-stack.md](docs/technical/03-frontend-stack.md) | React 客户端、UI 方案、状态管理策略 |
| 4 | [04-runtime-deployment-stack.md](docs/technical/04-runtime-deployment-stack.md) | Termux 运行、局域网联机、开发/部署流程 |
| 5 | [05-api-contract.md](docs/technical/05-api-contract.md) | HTTP/WS 事件协议、消息结构与处理原则 |
| 6 | [06-domain-models.md](docs/technical/06-domain-models.md) | Room/Player/Action/Vote 等核心数据结构 |
| 7 | [07-state-machine-spec.md](docs/technical/07-state-machine-spec.md) | 状态迁移、守卫条件、结算顺序、超时策略 |
| 8 | [08-error-codes-recovery.md](docs/technical/08-error-codes-recovery.md) | 错误码体系、重连恢复、前端提示策略 |
| 9 | [09-testing-strategy.md](docs/technical/09-testing-strategy.md) | 单测/集成测试范围、覆盖门槛、回归清单 |
| 10 | [10-engineering-conventions.md](docs/technical/10-engineering-conventions.md) | 命名、脚本、质量工具与协作规范 |
| 11 | [retro.md](docs/technical/retro.md) | 前端视觉风格唯一参考基线（90s 复古） |

**阅读建议**:
1. 先看 01-tech-stack-overview.md 确认方向
2. 再看后端/前端子文档确认实现边界
3. 最后看运行部署文档确认可执行性

---

### 2.3 prototype/ - UI 原型

**作用**: 游戏界面的 HTML 原型展示，包含所有游戏阶段的页面和交互示意。

**何时查阅**: 理解界面布局、组件结构、页面跳转逻辑时。

**主要文件**:
- [index.html](docs/prototype/index.html) - 完整 UI 原型，包含所有页面

**原型页面结构**:
```
pages/                    # 对应 React 页面组件
├── join-page.tsx         # 加入页面
├── lobby-page.tsx        # 等待大厅
├── role-page.tsx        # 角色查看
├── night/               # 夜晚阶段
│   ├── night-wait-page.tsx
│   ├── wolf-action-page.tsx
│   ├── seer-action-page.tsx
│   ├── witch-action-page.tsx
│   └── guard-action-page.tsx
├── day/                 # 白天阶段
│   ├── day-reveal-page.tsx
│   ├── hunter-skill-page.tsx
│   └── vote-page.tsx
├── end-page.tsx         # 游戏结束
└── disconnect-page.tsx  # 断线重连
```

**Modal 组件**:
- `LastWordsModal` (遗言提示)
- `IdiotRevealModal` (白痴翻牌)
- `VoteResultModal` (投票结果)
- `TieVoteModal` (平票重投)
- `NightResolveModal` (夜晚结算)

---

### 2.4 文档优先级与引用关系

```
产品设计 (product/)
    ↓ 派生
技术实现 (technical/)
    ↓ 指导
代码实现 (client/ & server/)
    ↓ 验证
UI 原型 (prototype/)
```

---

## 3. 工作流程约束

### 3.1 功能开发流程

```
brainstorming (设计探索)
    ↓
writing-plans (编写计划)
    ↓
代码实现 (遵循 belos-street + react-best-practices / fastify-best-practices)
    ↓
测试验证
```

### 3.2 文档查阅优先级

| 任务类型 | 优先查阅 |
|---------|---------|
| 修改游戏规则 | product/04-role-design.md, product/05-victory-conditions.md |
| 修改游戏流程 | product/03-game-flow.md, product/06-state-machine-events.md |
| 修改界面设计 | docs/prototype/index.html, product/08-ui-design.md |
| 后端开发 | technical/02-backend-stack.md, fastify-best-practices |
| 前端开发 | technical/03-frontend-stack.md, react-best-practices |
| API 接口 | technical/05-api-contract.md, technical/06-domain-models.md |
| 状态管理 | technical/03-frontend-stack.md, zustand |
| 错误处理 | technical/08-error-codes-recovery.md |

---

## 4. 代码编写约束

### 4.1 必须遵循的规范

1. **命名规范** (来自 belos-street):
   - 文件名: kebab-case
   - 组件名: kebab-case
   - 函数/变量: camelCase
   - 类型/接口: PascalCase

2. **代码组织** (来自 belos-street):
   - Feature-based 组织方式
   - 单一职责原则
   - 相关文件放一起

3. **LLM 编码指南** (来自 llm-coding-guidelines):
   - 简单优先
   - 手术刀式修改
   - 明确假设
   - 目标驱动执行

### 4.2 禁止事项

- 禁止在 brainstorming 批准前写代码
- 禁止添加未请求的功能
- 禁止修改范围外的代码
- 禁止添加 TODO/TBD 等占位符

---

## 5. 项目结构参考

```
werewolf/
├── client/                    # React 前端
│   └── src/
│       ├── pages/            # 页面组件 (kebab-case)
│       ├── components/       # 公共组件
│       ├── hooks/           # 自定义 Hooks
│       ├── stores/          # Zustand stores
│       ├── types/           # 类型定义
│       └── utils/           # 工具函数
├── server/                    # Fastify 后端
│   └── src/
│       ├── routes/          # 路由
│       ├── plugins/         # 插件
│       ├── services/        # 业务逻辑
│       ├── models/          # 数据模型
│       └── utils/           # 工具函数
├── .agents/
│   ├── skills/              # 技能定义
│   └── docs/                # 文档
│       ├── product/         # 产品设计
│       ├── technical/       # 技术实现
│       └── prototype/       # UI 原型
```
