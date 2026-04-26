import { useMemo, useState } from 'react'

import type { PlayerPublicSnapshot, RoleInfo } from '../types/game-ui'

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
  selfPlayerId: string
  disabledHint: string
  onSubmitWolfKill: (targetId: string) => void
  onSubmitSeerCheck: (targetId: string) => void
  onSubmitGuardProtect: (targetId: string) => void
  onSubmitWitchAction: (action: WitchAction, targetId?: string) => void
}

export const NightPage = ({
  phase,
  players,
  roleInfo,
  selfPlayerId,
  disabledHint,
  onSubmitWolfKill,
  onSubmitSeerCheck,
  onSubmitGuardProtect,
  onSubmitWitchAction
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

      if (phase === 'NIGHT_WOLF') {
        return player.id !== selfPlayerId
      }

      return true
    })
  }, [phase, players, selfPlayerId])

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
    if (!isSelfTurn) {
      return false
    }

    if (phase === 'NIGHT_WITCH') {
      if (witchAction === 'poison') {
        return Boolean(selectedTargetId)
      }
      return true
    }

    return Boolean(selectedTargetId)
  })()

  return (
    <section className="screen">
      <article className="panel stack">
        <h2 className="panel-title">{title}</h2>
        <p className="meta">
          你的身份：{roleInfo?.role ?? '未知'} · 当前阶段：{phase}
        </p>
      </article>

      <article className="panel stack">
        {phase === 'NIGHT_WITCH' && isSelfTurn ? (
          <>
            <label className="option-row">
              <input
                type="radio"
                checked={witchAction === 'save'}
                onChange={() => setWitchAction('save')}
              />
              使用解药
            </label>
            <label className="option-row">
              <input
                type="radio"
                checked={witchAction === 'poison'}
                onChange={() => setWitchAction('poison')}
              />
              使用毒药（需选目标）
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
      </article>
    </section>
  )
}
