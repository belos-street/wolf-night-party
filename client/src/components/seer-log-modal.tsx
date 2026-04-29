import type { SeerCheckRecord } from '../types/game-ui'

interface SeerLogModalProps {
  open: boolean
  latest: SeerCheckRecord | null
  history: SeerCheckRecord[]
  onClose: () => void
}

const formatAlignment = (alignment: 'GOOD' | 'WOLF') => {
  return alignment === 'WOLF' ? '狼人' : '好人'
}

export const SeerLogModal = ({
  open,
  latest,
  history,
  onClose
}: SeerLogModalProps) => {
  if (!open) {
    return null
  }

  return (
    <div className="modal-mask" role="presentation" onClick={onClose}>
      <section
        className="modal-panel stack"
        role="dialog"
        aria-modal="true"
        aria-label="预言家查验记录"
        onClick={(event) => event.stopPropagation()}>
        <h2 className="panel-title">👁️ 查验记录</h2>

        {latest ? (
          <p className="banner banner-info">
            最新查验：{latest.targetName} 是
            {formatAlignment(latest.alignment)}
          </p>
        ) : null}

        {history.length === 0 ? (
          <p className="muted">暂无查验记录。</p>
        ) : (
          <ul className="rule-list">
            {history.map((item) => (
              <li key={`${item.targetId}_${item.round}_${item.checkedAt}`}>
                第 {item.round} 夜：{item.targetName}（{formatAlignment(item.alignment)}）
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
