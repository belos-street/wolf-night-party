import { getStandardPreset } from '../constants/standard-presets'
import { PlayerList } from '../components/player-list'
import type { DisconnectNotice, GameSnapshot } from '../types/game-ui'

const roleLabelMap: Record<string, string> = {
  WOLF: '狼人',
  VILLAGER: '平民',
  SEER: '预言家',
  WITCH: '女巫',
  HUNTER: '猎人',
  GUARD: '守卫',
  IDIOT: '白痴'
}

interface LobbyPageProps {
  snapshot: GameSnapshot
  isHost: boolean
  canStartGame: boolean
  startDisabledReason: string | null
  pendingDisconnects: DisconnectNotice[]
  onStartGame: () => void
}

const formatPresetText = (roleCounts: Record<string, number>): string => {
  return Object.entries(roleCounts)
    .filter((entry) => entry[1] > 0)
    .map(([role, count]) => `${roleLabelMap[role] ?? role}x${count}`)
    .join(' · ')
}

export const LobbyPage = ({
  snapshot,
  isHost,
  canStartGame,
  startDisabledReason,
  pendingDisconnects,
  onStartGame
}: LobbyPageProps) => {
  const preset = getStandardPreset(snapshot.players.length)

  return (
    <section className="screen">
      <article className="panel stack">
        <h2 className="panel-title">等待大厅</h2>
        <p className="meta">当前玩家：{snapshot.players.length}</p>
        <PlayerList players={snapshot.players} />
      </article>

      <article className="panel stack">
        <h3 className="panel-title">标准平衡预设（只读）</h3>
        {preset ? (
          <>
            <p>
              {preset.playerCount} 人局 ·{' '}
              {preset.victoryRule === 'MASSACRE' ? '屠城' : '屠边'}
            </p>
            <p className="muted">{formatPresetText(preset.roleCounts)}</p>
          </>
        ) : (
          <p className="banner banner-error">
            当前人数不在标准范围，无法开局。
          </p>
        )}
      </article>

      {isHost ? (
        <article className="panel stack">
          <h3 className="panel-title">主机面板</h3>
          <p className="muted">主机仅可发起开始，不可手调角色配置。</p>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!canStartGame}
            onClick={onStartGame}>
            开始游戏
          </button>
          {!canStartGame && startDisabledReason ? (
            <p className="disabled-hint">{startDisabledReason}</p>
          ) : null}
        </article>
      ) : (
        <article className="panel">
          <p className="muted">等待主机开始游戏。</p>
        </article>
      )}

      {pendingDisconnects.length > 0 ? (
        <article className="panel stack">
          <h3 className="panel-title">断线公告</h3>
          <ul className="rule-list">
            {pendingDisconnects.map((item) => (
              <li key={item.playerId}>
                玩家 {item.playerId} 倒计时 {item.countdownSec}s
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </section>
  )
}
