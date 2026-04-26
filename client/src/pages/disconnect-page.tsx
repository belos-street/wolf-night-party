interface DisconnectPageProps {
  countdownSec: number
  onReconnect: () => void
}

const formatCountdown = (countdownSec: number): string => {
  const safeCountdown = Math.max(0, countdownSec)
  const mm = Math.floor(safeCountdown / 60)
  const ss = safeCountdown % 60

  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export const DisconnectPage = ({
  countdownSec,
  onReconnect
}: DisconnectPageProps) => {
  return (
    <section className="screen">
      <article className="panel stack">
        <h2 className="panel-title">⚠️ 连接中断</h2>
        <p>正在尝试重连...</p>
        <p className="meta">倒计时：{formatCountdown(countdownSec)}</p>
        <p className="muted">
          倒计时结束仍未恢复连接，服务端会按断线规则继续对局流程。
        </p>
        <button className="btn btn-primary" type="button" onClick={onReconnect}>
          立即重连
        </button>
      </article>
    </section>
  )
}
