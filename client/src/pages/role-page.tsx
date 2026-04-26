import type { RoleInfo } from '../types/game-ui'

interface RolePageProps {
  phase: string
  roleInfo: RoleInfo | null
  canConfirm: boolean
  disabledHint: string
  onConfirmRole: () => void
}

export const RolePage = ({
  phase,
  roleInfo,
  canConfirm,
  disabledHint,
  onConfirmRole
}: RolePageProps) => {
  return (
    <section className="screen">
      <article className="panel stack">
        <h2 className="panel-title">🎭 角色查看</h2>
        <p className="meta">当前阶段：{phase}</p>
        <article className="panel panel-inner stack">
          <h3 className="panel-title">{roleInfo?.role ?? '等待分配角色'}</h3>
          <p>{roleInfo?.description ?? '服务端尚未下发角色信息。'}</p>
        </article>
        <button
          className="btn btn-primary"
          type="button"
          disabled={!canConfirm}
          onClick={onConfirmRole}>
          我已知晓
        </button>
        {!canConfirm ? <p className="disabled-hint">{disabledHint}</p> : null}
      </article>
    </section>
  )
}
