import { type FormEvent, useState } from 'react'

const DEFAULT_NICKNAME_ORDER_KEY = 'wolf-night-party:next-default-order'

const createDefaultNickname = (): string => {
  if (typeof window === 'undefined') {
    return 'P1'
  }

  try {
    const rawValue = window.localStorage.getItem(DEFAULT_NICKNAME_ORDER_KEY)
    const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : 1
    const order = Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1

    window.localStorage.setItem(DEFAULT_NICKNAME_ORDER_KEY, String(order + 1))
    return `P${order}`
  } catch {
    return 'P1'
  }
}

interface JoinPageProps {
  canJoin: boolean
  isSubmitting: boolean
  serverUrl: string
  errorMessage: string | null
  onJoin: (nickname: string) => void
}

export const JoinPage = ({
  canJoin,
  isSubmitting,
  serverUrl,
  errorMessage,
  onJoin
}: JoinPageProps) => {
  const [nickname, setNickname] = useState(() => createDefaultNickname())

  if (!canJoin) {
    return (
      <section className="screen">
        <article className="panel stack">
          <h2 className="panel-title">游戏进行中</h2>
          <p>当前局已开始，暂时无法加入。</p>
          <p className="muted">请等待本局结束后重新尝试。</p>
          {errorMessage ? <p className="banner banner-error">{errorMessage}</p> : null}
        </article>
      </section>
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onJoin(nickname)
  }

  return (
    <section className="screen">
      <article className="panel stack">
        <h2 className="panel-title">🐺 加入游戏</h2>
        <form className="stack" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="nickname">
            昵称（1-10 字）
          </label>
          <input
            id="nickname"
            value={nickname}
            maxLength={10}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="输入你的昵称"
          />
          <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '加入中...' : '加入游戏'}
          </button>
        </form>
        <p className="meta">HTTP: {serverUrl}</p>
        {errorMessage ? <p className="banner banner-error">{errorMessage}</p> : null}
      </article>
      <article className="panel">
        <p className="muted">
          标准模式固定 6-12 人。开局后角色配置锁定，主机不可手调。
        </p>
      </article>
    </section>
  )
}
