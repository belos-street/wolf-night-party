import type { WitchKillHintRecord } from '../types/game-ui'

interface WitchKillLogModalProps {
  open: boolean
  latest: WitchKillHintRecord | null
  history: WitchKillHintRecord[]
  onClose: () => void
}

export const WitchKillLogModal = ({
  open,
  latest,
  history,
  onClose
}: WitchKillLogModalProps) => {
  if (!open) {
    return null
  }

  return (
    <div className="modal-mask" role="presentation" onClick={onClose}>
      <section
        className="modal-panel stack"
        role="dialog"
        aria-modal="true"
        aria-label="女巫刀口记录"
        onClick={(event) => event.stopPropagation()}>
        <h2 className="panel-title">🧪 刀口记录</h2>

        {latest ? (
          <p className="banner banner-info">最新提示：昨夜被刀的是 {latest.targetName}</p>
        ) : null}

        {history.length === 0 ? (
          <p className="muted">暂无刀口记录。</p>
        ) : (
          <ul className="rule-list">
            {history.map((item) => (
              <li key={`${item.round}_${item.targetId}_${item.receivedAt}`}>
                第 {item.round} 夜：{item.targetName}
              </li>
            ))}
          </ul>
        )}

        <button className="btn btn-primary" type="button" onClick={onClose}>
          我知道了
        </button>
      </section>
    </div>
  )
}
