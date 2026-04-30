import type { GameOverInfo, GameSnapshot } from '../types/game-ui'

interface EndPageProps {
  snapshot: GameSnapshot
  gameOverInfo: GameOverInfo | null
  canStartNewGame: boolean
  startDisabledReason: string | null
  isHost: boolean
  onStartNewGame: () => void
}

const winnerLabelMap: Record<string, string> = {
  GOOD: '好人阵营胜利',
  WOLF: '狼人阵营胜利'
}

export const EndPage = ({
  snapshot,
  gameOverInfo,
  canStartNewGame,
  startDisabledReason,
  isHost,
  onStartNewGame
}: EndPageProps) => {
  const playerNameById = new Map(
    snapshot.players.map((player) => [player.id, player.nickname])
  )

  return (
    <section className="screen">
      <article className="panel stack">
        <h2 className="panel-title">🎉 游戏结束</h2>
        <p>{winnerLabelMap[gameOverInfo?.winner ?? ''] ?? '等待胜负结果'}</p>
        <p className="meta">结束原因：{gameOverInfo?.reason ?? 'UNKNOWN'}</p>
      </article>

      <article className="panel stack">
        <h3 className="panel-title">角色公开</h3>
        {gameOverInfo?.roles && gameOverInfo.roles.length > 0 ? (
          <ul className="rule-list">
            {gameOverInfo.roles.map((item) => (
              <li key={`${item.playerId}_${item.role}`}>
                {playerNameById.get(item.playerId) ?? item.playerId}：{item.role}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">当前服务端尚未下发完整身份表。</p>
        )}
      </article>

      <article className="panel">
        <p className="meta">最终阶段：{snapshot.phase}</p>
        <button
          className="btn btn-primary"
          type="button"
          onClick={onStartNewGame}
          disabled={!canStartNewGame}>
          开始新的一局
        </button>
        {!canStartNewGame ? (
          <p className="muted">{startDisabledReason ?? (isHost ? '当前不可开始。' : '仅主机可开始新一局。')}</p>
        ) : null}
      </article>
    </section>
  )
}
