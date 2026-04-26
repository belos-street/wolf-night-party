import { GAME_RULE_SUMMARY, ROLE_HELP_SUMMARY } from '../constants/game-help'

interface HelpModalProps {
  open: boolean
  remoteHelpSummary: string | null
  onClose: () => void
}

export const HelpModal = ({
  open,
  remoteHelpSummary,
  onClose
}: HelpModalProps) => {
  if (!open) {
    return null
  }

  return (
    <div className="modal-mask" role="presentation" onClick={onClose}>
      <section
        className="modal-panel stack"
        role="dialog"
        aria-modal="true"
        aria-label="规则帮助"
        onClick={(event) => event.stopPropagation()}>
        <h2 className="panel-title">❓规则帮助</h2>

        {remoteHelpSummary ? (
          <p className="banner banner-info">{remoteHelpSummary}</p>
        ) : null}

        <p className="muted">简要规则</p>
        <ul className="rule-list">
          {GAME_RULE_SUMMARY.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>

        <p className="muted">职业说明</p>
        <ul className="rule-list">
          {ROLE_HELP_SUMMARY.map((item) => (
            <li key={item.role}>
              <strong>{item.role}</strong>：{item.description}
            </li>
          ))}
        </ul>

        <button className="btn btn-primary" type="button" onClick={onClose}>
          我知道了
        </button>
      </section>
    </div>
  )
}
