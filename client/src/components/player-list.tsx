import type { PlayerPublicSnapshot } from '../types/game-ui'

interface PlayerListProps {
  players: PlayerPublicSnapshot[]
}

export const PlayerList = ({ players }: PlayerListProps) => {
  return (
    <ul className="player-list">
      {players
        .slice()
        .sort((left, right) => left.seatNo - right.seatNo)
        .map((player) => (
          <li key={player.id} className="player-item">
            <div className="row">
              <span>
                #{player.seatNo} {player.nickname}
              </span>
              <div className="row">
                {player.isHost ? <span className="chip chip-host">主机</span> : null}
                <span className={player.alive ? 'chip chip-alive' : 'chip chip-dead'}>
                  {player.alive ? '存活' : '死亡'}
                </span>
              </div>
            </div>
          </li>
        ))}
    </ul>
  )
}
