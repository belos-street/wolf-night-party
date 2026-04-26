import { useMemo, useState } from 'react'

import type {
  DayDeath,
  PlayerPublicSnapshot,
  RoleInfo,
  VoteResultInfo
} from '../types/game-ui'

const dayPhaseTitleMap: Record<string, string> = {
  DAY_REVEAL: '☀️ 白天通报',
  DAY_HUNTER_NIGHT: '🔫 猎人技能（夜晚触发）',
  DAY_LAST_WORDS: '🎤 遗言阶段',
  DAY_DISCUSSION: '💬 讨论阶段',
  DAY_VOTE: '🗳️ 放逐投票',
  DAY_REVOTE: '⚖️ 平票重投',
  DAY_VOTE_RESULT: '📊 投票结果',
  DAY_IDIOT_REVEAL: '🤪 白痴翻牌',
  DAY_HUNTER_VOTE: '🔫 猎人技能（放逐触发）'
}

interface DayPageProps {
  phase: string
  players: PlayerPublicSnapshot[]
  roleInfo: RoleInfo | null
  selfPlayerId: string
  deaths: DayDeath[]
  voteResult: VoteResultInfo | null
  canSubmitVote: boolean
  canAdvancePhase: boolean
  disabledHint: string
  onAdvancePhase: () => void
  onSubmitVote: (targetId: string | 'abstain') => void
  onSubmitHunterShot: (targetId: string | null) => void
}

export const DayPage = ({
  phase,
  players,
  roleInfo,
  selfPlayerId,
  deaths,
  voteResult,
  canSubmitVote,
  canAdvancePhase,
  disabledHint,
  onAdvancePhase,
  onSubmitVote,
  onSubmitHunterShot
}: DayPageProps) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | 'abstain' | null>(
    null
  )

  const isHunterPhase =
    phase === 'DAY_HUNTER_NIGHT' || phase === 'DAY_HUNTER_VOTE'
  const isSelfHunter = roleInfo?.role === 'HUNTER'
  const isSelfAlive = players.some((player) => {
    return player.id === selfPlayerId && player.alive
  })

  const hunterTargets = useMemo(() => {
    return players.filter((player) => player.alive && player.id !== selfPlayerId)
  }, [players, selfPlayerId])

  const voteTargets = useMemo(() => {
    return players.filter((player) => player.alive)
  }, [players])

  const title = dayPhaseTitleMap[phase] ?? '☀️ 白天阶段'
  const canSubmitHunterShot = isHunterPhase && isSelfHunter
  const isAdvanceOnlyPhase =
    phase === 'DAY_REVEAL' ||
    phase === 'DAY_LAST_WORDS' ||
    phase === 'DAY_DISCUSSION' ||
    phase === 'DAY_VOTE_RESULT' ||
    phase === 'DAY_IDIOT_REVEAL'

  const advanceLabelMap: Record<string, string> = {
    DAY_REVEAL: '进入下一阶段',
    DAY_LAST_WORDS: '遗言结束，继续',
    DAY_DISCUSSION: '讨论结束，进入投票',
    DAY_VOTE_RESULT: '公布完毕，进入下一夜',
    DAY_IDIOT_REVEAL: '确认翻牌，继续'
  }

  return (
    <section className="screen">
      <article className="panel stack">
        <h2 className="panel-title">{title}</h2>
        <p className="meta">你的身份：{roleInfo?.role ?? '未知'}</p>
      </article>

      {deaths.length > 0 ? (
        <article className="panel stack">
          <h3 className="panel-title">昨夜死亡</h3>
          <ul className="rule-list">
            {deaths.map((death) => (
              <li key={`${death.playerId}_${death.cause ?? 'unknown'}`}>
                {death.playerId}
                {death.cause ? `（${death.cause}）` : ''}
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {isAdvanceOnlyPhase ? (
        <article className="panel stack">
          <h3 className="panel-title">阶段推进</h3>
          <p className="muted">
            当前阶段为流程确认阶段，点击按钮后将由服务端推进。
          </p>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!canAdvancePhase}
            onClick={onAdvancePhase}>
            {advanceLabelMap[phase] ?? '继续'}
          </button>
          {!canAdvancePhase ? <p className="disabled-hint">{disabledHint}</p> : null}
        </article>
      ) : null}

      {canSubmitHunterShot ? (
        <article className="panel stack">
          <h3 className="panel-title">猎人开枪</h3>
          <div className="target-grid">
            {hunterTargets.map((player) => (
              <button
                key={player.id}
                className={`target ${selectedTargetId === player.id ? 'selected' : ''}`}
                type="button"
                onClick={() => setSelectedTargetId(player.id)}>
                {player.nickname}
              </button>
            ))}
          </div>
          <div className="button-row">
            <button
              className="btn btn-primary"
              type="button"
              disabled={!selectedTargetId || selectedTargetId === 'abstain'}
              onClick={() => {
                if (selectedTargetId && selectedTargetId !== 'abstain') {
                  onSubmitHunterShot(selectedTargetId)
                }
              }}>
              确认开枪
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => onSubmitHunterShot(null)}>
              跳过开枪
            </button>
          </div>
        </article>
      ) : null}

      {isHunterPhase && !canSubmitHunterShot ? (
        <article className="panel stack">
          <h3 className="panel-title">等待猎人操作</h3>
          <p className="muted">当前由猎人执行技能，其他玩家请等待。</p>
        </article>
      ) : null}

      {!isAdvanceOnlyPhase && !isHunterPhase ? (
        <article className="panel stack">
          <h3 className="panel-title">白天投票</h3>
          <div className="target-grid">
            {voteTargets.map((player) => (
              <button
                key={player.id}
                className={`target ${selectedTargetId === player.id ? 'selected' : ''}`}
                type="button"
                onClick={() => setSelectedTargetId(player.id)}
                disabled={!canSubmitVote || !isSelfAlive}>
                {player.nickname}
              </button>
            ))}
          </div>
          <button
            className={`btn btn-ghost ${selectedTargetId === 'abstain' ? 'selected' : ''}`}
            type="button"
            disabled={!canSubmitVote || !isSelfAlive}
            onClick={() => setSelectedTargetId('abstain')}>
            弃票
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!canSubmitVote || !selectedTargetId || !isSelfAlive}
            onClick={() => {
              if (selectedTargetId === 'abstain') {
                onSubmitVote('abstain')
                return
              }

              if (selectedTargetId) {
                onSubmitVote(selectedTargetId)
              }
            }}>
            提交投票
          </button>
          {!canSubmitVote ? <p className="disabled-hint">{disabledHint}</p> : null}
        </article>
      ) : null}

      {voteResult ? (
        <article className="panel stack">
          <h3 className="panel-title">投票结果</h3>
          <p>
            {voteResult.isTie
              ? '本轮平票，无人被放逐。'
              : `被放逐玩家：${voteResult.eliminatedId ?? '无'}`}
          </p>
        </article>
      ) : null}
    </section>
  )
}
