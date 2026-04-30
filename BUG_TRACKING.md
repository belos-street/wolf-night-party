# Bug 跟踪清单

> 目的：集中记录联调阶段发现的问题、修复动作与复测结论。  
> 维护规则：每新增一个问题就追加一行；修复后更新“修复情况”和“状态”；你复测通过后改为 `Verified`。

| Bug ID | 提出日期 | 问题描述 | 影响范围 | 修复情况 | 相关改动 | 状态 | 复测结论 |
|---|---|---|---|---|---|---|---|
| BUG-001 | 2026-04-29 | 其他用户加入后，等待大厅玩家列表不实时刷新，需手动刷新页面。 | Lobby 实时同步 | 新玩家 WS 连接建立后，服务端向所有在线客户端广播最新 `game:snapshot`。并补了回归测试。 | `server/src/routes/ws/index.ts`、`server/test/routes/ws.test.ts` | Fixed | 待你复测 |
| BUG-002 | 2026-04-29 | 角色页点击“我已知晓”后，按钮未立即禁用，缺少等待其他玩家确认的友好提示。 | Role 确认交互 | 增加本地提交态：点击后立即禁用按钮，并显示“请等待别的玩家确认身份。”；离开 `ROLE_VIEW` 后自动重置。 | `client/src/App.tsx` | Fixed | 待你复测 |
| BUG-003 | 2026-04-29 | 游戏进行中无法再次查看自己的身份。 | 全流程可用性 | 在全局头部增加常驻身份显示（`身份 待分配/角色名`），所有阶段可见。 | `client/src/App.tsx` | Fixed | 待你复测 |
| BUG-004 | 2026-04-29 | 预言家查验后没有弹窗告知结果，且后续无法再次查看查验记录。 | 预言家体验与信息留存 | 服务端在预言家提交查验后私发 `SEER_RESULT`；前端收到后弹出查验结果 Modal，并提供“查验记录”入口可重复查看历史。 | `server/src/routes/ws/index.ts`、`client/src/hooks/use-realtime-game-client.ts`、`client/src/components/seer-log-modal.tsx`、`client/src/App.tsx` | Fixed | 待你复测 |
| BUG-005 | 2026-04-29 | 狼人夜晚刀人时，UI 里看不到队友刀向谁，线下确认容易暴露身份。 | 狼人协同体验 | 服务端在狼人提交后向狼人阵营私发 `WOLF_SYNC`；前端狼人夜晚新增“队友刀口同步”区显示各狼当前刀向。 | `server/src/routes/ws/index.ts`、`client/src/hooks/use-realtime-game-client.ts`、`client/src/pages/night-page.tsx` | Fixed | 待你复测 |
| BUG-006 | 2026-04-29 | 白天“昨夜死亡”显示为玩家 ID（如 `p_xxx`），难以识别是谁。 | 白天通报可读性 | 死亡通报改为显示死亡玩家昵称。 | `client/src/pages/day-page.tsx` | Fixed | 待你复测 |
| BUG-007 | 2026-04-29 | 加入页默认昵称固定为“张三”，不利于多标签页快速联调。 | 加入体验 | 默认昵称改为按打开顺序自动生成 `P{order}`（主机通常为 `P1`）。 | `client/src/pages/join-page.tsx` | Fixed | 待你复测 |
| BUG-008 | 2026-04-29 | 加入时未校验重名，易出现同名玩家。 | 加入校验 | 服务端 `joinRoom` 增加重名拦截（忽略大小写），返回 `NICKNAME_DUPLICATE`。 | `server/src/game/room-store.ts`、`server/src/shared/errors/http-error-map.ts`、`server/test/routes/api.test.ts` | Fixed | 待你复测 |
| BUG-009 | 2026-04-29 | 狼人刀人目标不一致时未拦截，流程直接继续。 | 夜晚规则一致性 | 狼人全员提交后若目标不一致，清空当夜狼刀并要求重选；并私发 `WOLF_RESELECT` 提示。 | `server/src/game/game-engine.ts`、`server/src/routes/ws/index.ts`、`server/test/game/game-engine.test.ts` | Fixed | 待你复测 |
| BUG-010 | 2026-04-29 | 遗言阶段“遗言结束”任何玩家都可点，推进权限不清晰。 | 白天流程控制 | `DAY_LAST_WORDS` 阶段改为仅主机可推进；前后端均加限制与提示。 | `server/src/routes/ws/index.ts`、`client/src/App.tsx`、`server/test/routes/ws.test.ts` | Fixed | 待你复测 |
| BUG-011 | 2026-04-29 | `DAY_REVEAL` 通报时显示了死亡原因（狼人刀杀/女巫毒杀），信息过多。 | 白天信息披露 | 昨夜死亡列表改为只显示死亡玩家昵称，不再展示死因。 | `client/src/pages/day-page.tsx` | Fixed | 待你复测 |
| BUG-012 | 2026-04-29 | `DAY_REVEAL` 阶段应仅主机可推进；且主机死亡后仍应保留推进权限。 | 白天流程控制 | `DAY_REVEAL` 与 `DAY_LAST_WORDS` 均限制为仅主机可推进；权限按主机身份判定，不依赖存活状态。补充 ws 回归测试。 | `server/src/routes/ws/index.ts`、`client/src/App.tsx`、`server/test/routes/ws.test.ts` | Fixed | 待你复测 |
| BUG-013 | 2026-04-29 | 投票提交后仍可改票，规则不严谨。 | 白天投票规则 | 服务端增加“每轮每人仅可提交一次”校验，重复提交返回 `ALREADY_SUBMITTED`；前端提交后本轮按钮锁定。 | `server/src/game/game-engine.ts`、`server/src/routes/ws/index.ts`、`client/src/pages/day-page.tsx`、`server/test/game/game-engine.test.ts` | Fixed | 待你复测 |
| BUG-014 | 2026-04-29 | 投票阶段可以投自己。 | 白天投票规则 | 前端投票目标隐藏自己；服务端增加禁止自投的校验（`INVALID_TARGET`）。 | `client/src/pages/day-page.tsx`、`server/src/game/game-engine.ts`、`server/test/game/game-engine.test.ts` | Fixed | 待你复测 |
| BUG-015 | 2026-04-29 | 投票阶段缺少 10 秒倒计时，未投票玩家不会自动按弃票处理。 | 白天投票流程 | 服务端在 `DAY_VOTE/DAY_REVOTE` 自动启动 10 秒计时并超时结算（未投视为弃票）；前端显示倒计时。 | `server/src/routes/ws/index.ts`、`server/src/game/game-engine.ts`、`client/src/hooks/use-realtime-game-client.ts`、`client/src/pages/day-page.tsx`、`server/test/routes/ws.test.ts` | Fixed | 待你复测 |
| BUG-016 | 2026-04-29 | 投票结束后没有集中弹窗展示每个人投给了谁。 | 白天结果可视化 | 服务端 `game:vote_result` 增加每人投票明细；前端新增投票结果 Modal 展示逐票结果。 | `server/src/routes/ws/index.ts`、`client/src/components/vote-result-modal.tsx`、`client/src/hooks/use-realtime-game-client.ts`、`client/src/App.tsx` | Fixed | 待你复测 |
| BUG-017 | 2026-04-29 | `DAY_DISCUSSION` 阶段应仅主机可推进。 | 白天流程控制 | `DAY_DISCUSSION` 推进权限改为仅主机可执行，前后端同步限制并补 ws 用例。 | `server/src/routes/ws/index.ts`、`client/src/App.tsx`、`server/test/routes/ws.test.ts` | Fixed | 待你复测 |
| BUG-018 | 2026-04-29 | 投票结果区域与弹窗显示被放逐玩家 ID（`p_xxx`），不显示昵称。 | 结果可读性 | `game:vote_result` 增加 `eliminatedName`，前端面板与 Modal 优先展示昵称。 | `server/src/routes/ws/index.ts`、`client/src/hooks/use-realtime-game-client.ts`、`client/src/pages/day-page.tsx`、`client/src/components/vote-result-modal.tsx` | Fixed | 待你复测 |
| BUG-019 | 2026-04-29 | `DAY_VOTE_RESULT` 阶段应仅主机可推进。 | 白天流程控制 | `DAY_VOTE_RESULT` 推进权限改为仅主机可执行，前后端同步限制并补 ws 用例。 | `server/src/routes/ws/index.ts`、`client/src/App.tsx`、`server/test/routes/ws.test.ts` | Fixed | 待你复测 |
| BUG-020 | 2026-04-29 | 夜晚刀人阶段偶发出现已死亡玩家可选，并提交后报 `PLAYER_DEAD`。 | 夜晚目标一致性 | 前端夜晚提交前增加“目标仍在当前可选列表”校验，并移除 phase-change 的前端乐观 phase 覆盖，改为以 snapshot 为准，避免阶段切换瞬间的脏目标。 | `client/src/pages/night-page.tsx`、`client/src/hooks/use-realtime-game-client.ts` | Fixed | 待你复测 |
| BUG-021 | 2026-04-30 | 预言家查验阶段出现“自己”作为可选目标。 | 夜晚目标合理性 | 前端 `NIGHT_SEER` 目标列表排除自己；后端新增禁止预言家查验自己校验（`INVALID_TARGET`）。 | `client/src/pages/night-page.tsx`、`server/src/game/game-engine.ts`、`server/test/game/game-engine.test.ts` | Fixed | 待你复测 |
| BUG-022 | 2026-04-30 | 女巫“第二夜及之后被刀不能自救”未在 UI 上体现。 | 女巫技能规则 | 服务端下发女巫当夜可用能力（`WITCH_OPTIONS`），当前端识别为“被刀且非首夜”时隐藏解药可选项；后端仍保留强校验。 | `server/src/routes/ws/index.ts`、`client/src/hooks/use-realtime-game-client.ts`、`client/src/pages/night-page.tsx`、`server/src/game/game-engine.ts`、`server/test/game/game-engine.test.ts` | Fixed | 待你复测 |
| BUG-023 | 2026-04-30 | 女巫毒药可对自己生效（应全程禁止）。 | 女巫技能规则 | 前端毒药目标列表排除自己；后端新增禁止毒自己校验（`INVALID_TARGET`）。 | `client/src/pages/night-page.tsx`、`server/src/game/game-engine.ts`、`server/test/game/game-engine.test.ts` | Fixed | 待你复测 |
| BUG-024 | 2026-04-30 | 游戏结束后缺少“开始新的一局”入口，无法原班人马快速重开。 | 结束页与对局重开 | 结束页增加“开始新的一局”按钮（仅主机可点）；服务端允许 `ENDED` 状态下由主机重新发牌开局，并保留原玩家名单。 | `client/src/pages/end-page.tsx`、`client/src/App.tsx`、`server/src/game/game-engine.ts`、`server/test/game/game-engine.test.ts`、`server/test/routes/ws.test.ts` | Fixed | 待你复测 |
| BUG-025 | 2026-04-30 | 女巫回合未明确告知“昨夜被刀玩家”，且缺少可回看记录。 | 女巫信息提示 | 服务端在 `NIGHT_WITCH` 私发 `WITCH_WOLF_TARGET`（目标昵称+回合）；前端女巫回合展示刀口提示，并新增“刀口记录”弹窗支持历史回看。 | `server/src/routes/ws/index.ts`、`client/src/hooks/use-realtime-game-client.ts`、`client/src/pages/night-page.tsx`、`client/src/components/witch-kill-log-modal.tsx`、`client/src/App.tsx`、`server/test/routes/ws.test.ts` | Fixed | 待你复测 |
| BUG-026 | 2026-04-30 | 狼人夜晚行动阶段不能选择自己（需支持“自刀”）。 | 夜晚目标选择 | 前端 `NIGHT_WOLF` 目标列表允许包含自己（仅保留预言家/女巫毒药对自己的限制）；后端本身已允许。补充回归测试覆盖狼人自刀。 | `client/src/pages/night-page.tsx`、`server/test/game/game-engine.test.ts` | Fixed | 待你复测 |
| BUG-027 | 2026-04-30 | `DAY_LAST_WORDS` 在全程无人死亡时仍出现，流程冗余。 | 白天流程推进 | `DAY_REVEAL` 推进时，若全局死亡记录为空则直接进入 `DAY_DISCUSSION`，跳过 `DAY_LAST_WORDS`。补充回归测试。 | `server/src/game/game-engine.ts`、`server/test/game/game-engine.test.ts` | Fixed | 待你复测 |
| BUG-028 | 2026-04-30 | 死亡玩家在夜晚仍显示技能按钮并可点击（虽然后端拦截）。 | 夜晚交互与权限 | 前端夜晚页面按存活态控制：死亡玩家显示“已死亡不可操作”；若死亡玩家是主机，仅保留“主机推进到下一步”按钮；服务端补充限制：死亡且非主机不能通过 `player:confirm_role` 强行推进。 | `client/src/pages/night-page.tsx`、`client/src/App.tsx`、`server/src/routes/ws/index.ts`、`server/test/routes/ws.test.ts` | Fixed | 待你复测 |
| BUG-029 | 2026-04-30 | 平票后应进入“PK发言 -> 重新投票”，而不是直接入夜。 | 白天投票流程 | 新增 `DAY_PK_SPEECH` 阶段；首轮平票先进入 PK 发言，再进入 `DAY_REVOTE`；复投仅允许对平票玩家投票；复投仍平票则无人出局入夜。前端新增 PK 阶段展示与复投候选限制。 | `server/src/game/constants/game-phases.ts`、`server/src/game/game-engine.ts`、`server/src/routes/ws/index.ts`、`client/src/hooks/use-realtime-game-client.ts`、`client/src/pages/day-page.tsx`、`client/src/App.tsx`、`server/test/game/game-engine.test.ts`、`server/test/routes/ws.test.ts` | Fixed | 待你复测 |

## 复测记录（手工填写）

| Bug ID | 复测日期 | 复测人 | 结果(PASS/FAIL) | 备注 |
|---|---|---|---|---|
| BUG-001 |  |  |  |  |
| BUG-002 |  |  |  |  |
| BUG-003 |  |  |  |  |
| BUG-004 |  |  |  |  |
| BUG-005 |  |  |  |  |
| BUG-006 |  |  |  |  |
| BUG-007 |  |  |  |  |
| BUG-008 |  |  |  |  |
| BUG-009 |  |  |  |  |
| BUG-010 |  |  |  |  |
| BUG-011 |  |  |  |  |
| BUG-012 |  |  |  |  |
| BUG-013 |  |  |  |  |
| BUG-014 |  |  |  |  |
| BUG-015 |  |  |  |  |
| BUG-016 |  |  |  |  |
| BUG-017 |  |  |  |  |
| BUG-018 |  |  |  |  |
| BUG-019 |  |  |  |  |
| BUG-020 |  |  |  |  |
| BUG-021 |  |  |  |  |
| BUG-022 |  |  |  |  |
| BUG-023 |  |  |  |  |
| BUG-024 |  |  |  |  |
| BUG-025 |  |  |  |  |
| BUG-026 |  |  |  |  |
| BUG-027 |  |  |  |  |
| BUG-028 |  |  |  |  |
| BUG-029 |  |  |  |  |
