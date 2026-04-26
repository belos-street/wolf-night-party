# 工程约定与协作规范

## 1. 目标

统一目录、命名、脚本与提交流程，降低多人协作成本。

## 2. 目录约定

```text
project/
  client/                # Vite + React + TS
  server/                # Fastify + TS + ESM
  .agents/docs/
    product/
    technical/
    prototype/
```

## 3. 命名约定

1. 事件名：`domain:action`，例如 `night:submit_kill`
2. TS 类型：`PascalCase`，例如 `RoomState`
3. 变量/函数：`camelCase`
4. 常量与枚举值：`UPPER_SNAKE_CASE`

## 4. TypeScript 约束

1. 开启 `strict` 模式
2. 禁止 `any`（确有必要时使用 `unknown` + 显式收敛）
3. 协议 payload 必须经过 schema 校验

## 5. 代码质量工具

1. `ESLint`：静态检查
2. `Prettier`：格式统一
3. `node:test` + `c8`：后端单测与覆盖率（沿用 Fastify 默认）
4. `Vitest`（可选）：前端组件测试阶段再引入
4. `husky + lint-staged`（可选）：提交前自动检查

## 6. 脚本约定（建议）

```bash
# root
pnpm dev
pnpm build
pnpm lint
pnpm test

# client
pnpm dev
pnpm build

# server
pnpm dev
pnpm build:ts
pnpm test
```

## 7. Git 提交约定

采用 Conventional Commits：

- `feat: ...`
- `fix: ...`
- `refactor: ...`
- `docs: ...`
- `test: ...`
- `chore: ...`

## 8. 文档协作约定

1. 产品规则改动优先更新 `product/*`
2. 技术实现改动同步更新 `technical/*`
3. API、状态机、错误码改动必须同时更新相关三份文档：
   - `05-api-contract.md`
   - `07-state-machine-spec.md`
   - `08-error-codes-recovery.md`

---

> 相关文档：
> - [技术栈总览](./01-tech-stack-overview.md)
> - [测试策略](./09-testing-strategy.md)
