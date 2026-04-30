import type { VoteResultInfo } from '../types/game-ui'

interface VoteResultModalProps {
  open: boolean
  result: VoteResultInfo | null
  onClose: () => void
}

export const VoteResultModal = ({ open, result, onClose }: VoteResultModalProps) => {
  if (!open || !result) {
    return null
  }

  const summary = result.isTie
    ? '本轮平票，无人出局。'
    : `出局玩家：${result.eliminatedName ?? result.eliminatedId ?? '无人'}`

  return (
    <div className="modal-mask" role="presentation" onClick={onClose}>
      <article
        className="modal-panel stack"
        role="dialog"
        aria-modal="true"
        aria-label="投票结果"
        onClick={(event) => event.stopPropagation()}>
        <h3 className="panel-title">投票结果（第 {result.roundNo} 轮）</h3>
        <p>{summary}</p>
        <ul className="rule-list">
          {result.ballots.map((ballot) => (
            <li key={ballot.voterId}>
              {ballot.voterName} ➜ {ballot.targetName ?? '弃票'}
            </li>
          ))}
        </ul>
        <button className="btn btn-primary" type="button" onClick={onClose}>
          我知道了
        </button>
      </article>
    </div>
  )
}
