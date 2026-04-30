import { useEffect, useMemo, useState } from 'react'

import type {
  PlayerPublicSnapshot,
  RoleInfo,
  WitchKillHintRecord,
  WitchOptions,
  WolfVoteHint
} from '../types/game-ui'

const nightPhaseTitleMap: Record<string, string> = {
  NIGHT_WOLF: '🐺 狼人行动',
  NIGHT_SEER: '👁️ 预言家查验',
  NIGHT_GUARD: '🛡️ 守卫守护',
  NIGHT_WITCH: '🧪 女巫用药',
  NIGHT_RESOLVE: '🌙 夜晚结算'
}

const nightActionRoleMap: Record<string, string> = {
  NIGHT_WOLF: 'WOLF',
  NIGHT_SEER: 'SEER',
  NIGHT_GUARD: 'GUARD',
  NIGHT_WITCH: 'WITCH'
}

type WitchAction = 'save' | 'poison' | 'skip'

interface NightPageProps {
  phase: string
  players: PlayerPublicSnapshot[]
  roleInfo: RoleInfo | null
  wolfVoteHints: WolfVoteHint[]
  latestWitchKillHint: WitchKillHintRecord | null
  witchOptions: WitchOptions | null
  selfPlayerId: string
  isSelfAlive: boolean
  canAdvanceWhenDead: boolean
  disabledHint: string
  onSubmitWolfKill: (targetId: string) => void
  onSubmitSeerCheck: (targetId: string) => void
  onSubmitGuardProtect: (targetId: string) => void
  onSubmitWitchAction: (action: WitchAction, targetId?: string) => void
  onAdvancePhase: () => void
}

export const NightPage = ({
  phase,
  players,
  roleInfo,
  wolfVoteHints,
  latestWitchKillHint,
  witchOptions,
  selfPlayerId,
  isSelfAlive,
  canAdvanceWhenDead,
  disabledHint,
  onSubmitWolfKill,
  onSubmitSeerCheck,
  onSubmitGuardProtect,
  onSubmitWitchAction,
  onAdvancePhase
}: NightPageProps) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [witchAction, setWitchAction] = useState<WitchAction>('skip')

  const title = nightPhaseTitleMap[phase] ?? '🌙 夜晚等待'
  const expectedRole = nightActionRoleMap[phase] ?? null
  const isSelfTurn = expectedRole !== null && roleInfo?.role === expectedRole

  const actionTargets = useMemo(() => {
    return players.filter((player) => {
      if (!player.alive) {
        return false
      }

      if (phase === 'NIGHT_SEER') {
        return player.id !== selfPlayerId
      }

      if (phase === 'NIGHT_WITCH' && witchAction === 'poison') {
        return player.id !== selfPlayerId
      }

      return true
    })
  }, [phase, players, selfPlayerId, witchAction])

  const selectableTargetIds = useMemo(() => {
    return new Set(actionTargets.map((player) => player.id))
  }, [actionTargets])

  useEffect(() => {
    if (!selectedTargetId) {
      return
    }

    if (!selectableTargetIds.has(selectedTargetId)) {
      setSelectedTargetId(null)
    }
  }, [selectableTargetIds, selectedTargetId])

  useEffect(() => {
    if (phase !== 'NIGHT_WITCH') {
      return
    }

    if (witchAction === 'save' && witchOptions && !witchOptions.canSave) {
      setWitchAction('skip')
      return
    }

    if (witchAction === 'poison' && witchOptions && !witchOptions.canPoison) {
      setWitchAction('skip')
    }
  }, [phase, witchAction, witchOptions])

  const handleSubmitNightAction = () => {
    if (!isSelfTurn) {
      return
    }

    if (phase === 'NIGHT_WITCH') {
      if (witchAction === 'poison' && selectedTargetId) {
        onSubmitWitchAction('poison', selectedTargetId)
        return
      }

      if (witchAction === 'save') {
        onSubmitWitchAction('save')
        return
      }

      onSubmitWitchAction('skip')
      return
    }

    if (!selectedTargetId) {
      return
    }

    if (!selectableTargetIds.has(selectedTargetId)) {
      setSelectedTargetId(null)
      return
    }

    if (phase === 'NIGHT_WOLF') {
      onSubmitWolfKill(selectedTargetId)
      return
    }

    if (phase === 'NIGHT_SEER') {
      onSubmitSeerCheck(selectedTargetId)
      return
    }

    if (phase === 'NIGHT_GUARD') {
      onSubmitGuardProtect(selectedTargetId)
    }
  }

  const buttonLabel = (() => {
    if (phase === 'NIGHT_WOLF') {
      return '确认刀人'
    }

    if (phase === 'NIGHT_SEER') {
      return '确认查验'
    }

    if (phase === 'NIGHT_GUARD') {
      return '确认守护'
    }

    if (phase === 'NIGHT_WITCH') {
      return '确认用药'
    }

    return '等待推进'
  })()

  const canSubmit = (() => {
    if (!isSelfAlive) {
      return false
    }

    if (!isSelfTurn) {
      return false
    }

    if (phase === 'NIGHT_WITCH') {
      if (witchAction === 'poison') {
        if (witchOptions && !witchOptions.canPoison) {
          return false
        }

        return Boolean(selectedTargetId)
      }

      if (witchAction === 'save') {
        return witchOptions ? witchOptions.canSave : true
      }

      return true
    }

    return Boolean(selectedTargetId && selectableTargetIds.has(selectedTargetId))
  })()

  const isWolfPhaseForSelf = phase === 'NIGHT_WOLF' && roleInfo?.role === 'WOLF'
  const canUseSave = witchOptions ? witchOptions.canSave : true
  const canUsePoison = witchOptions ? witchOptions.canPoison : true

  return (
    <section className="screen">
      <article className="panel stack">
        <h2 className="panel-title">{title}</h2>
        <p className="meta">
          你的身份：{roleInfo?.role ?? '未知'} · 当前阶段：{phase}
        </p>
      </article>

      <article className="panel stack">
        {isWolfPhaseForSelf ? (
          <article className="panel panel-inner stack">
            <h3 className="panel-title">🐺 队友刀口同步</h3>
            {wolfVoteHints.length === 0 ? (
              <p className="muted">暂未收到队友提交，等待中。</p>
            ) : (
              <ul className="rule-list">
                {wolfVoteHints.map((hint) => (
                  <li key={`${hint.wolfId}_${hint.targetId}`}>
                    {hint.wolfName} {'->'} {hint.targetName}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ) : null}

        {phase === 'NIGHT_WITCH' && isSelfTurn ? (
          <>
            <article className="panel panel-inner stack">
              <h3 className="panel-title">🧪 今夜刀口提示</h3>
              {latestWitchKillHint ? (
                <p>
                  昨夜被刀：{latestWitchKillHint.targetName}（第 {latestWitchKillHint.round} 夜）
                </p>
              ) : (
                <p className="muted">暂未收到刀口信息。</p>
              )}
            </article>
            <label className="option-row">
              {canUseSave ? (
                <>
                  <input
                    type="radio"
                    checked={witchAction === 'save'}
                    onChange={() => setWitchAction('save')}
                  />
                  使用解药
                </>
              ) : (
                <>
                  <input type="radio" checked={false} disabled />
                  <span className="muted">
                    解药不可用
                    {witchOptions?.isSelfTargeted ? '（第二夜起不能自救）' : ''}
                  </span>
                </>
              )}
            </label>
            <label className="option-row">
              {canUsePoison ? (
                <>
                  <input
                    type="radio"
                    checked={witchAction === 'poison'}
                    onChange={() => setWitchAction('poison')}
                  />
                  使用毒药（需选目标）
                </>
              ) : (
                <>
                  <input type="radio" checked={false} disabled />
                  <span className="muted">毒药不可用</span>
                </>
              )}
            </label>
            <label className="option-row">
              <input
                type="radio"
                checked={witchAction === 'skip'}
                onChange={() => setWitchAction('skip')}
              />
              不使用药水
            </label>
          </>
        ) : null}

        {isSelfAlive ? (
          <>
            <div className="target-grid">
              {actionTargets.map((player) => (
                <button
                  key={player.id}
                  className={`target ${selectedTargetId === player.id ? 'selected' : ''}`}
                  type="button"
                  onClick={() => setSelectedTargetId(player.id)}
                  disabled={!isSelfTurn}>
                  {player.nickname}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary"
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmitNightAction}>
              {buttonLabel}
            </button>
            {!canSubmit ? <p className="disabled-hint">{disabledHint}</p> : null}
          </>
        ) : (
          <article className="panel panel-inner stack">
            <h3 className="panel-title">你已死亡</h3>
            <p className="muted">已死亡玩家不能执行夜晚技能。</p>
            {canAdvanceWhenDead ? (
              <button className="btn btn-primary" type="button" onClick={onAdvancePhase}>
                主机推进到下一步
              </button>
            ) : null}
          </article>
        )}
      </article>
    </section>
  )
}
