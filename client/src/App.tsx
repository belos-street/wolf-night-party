import { useMemo, useState } from 'react'

import { HelpModal } from './components/help-modal'
import { useGameClient } from './hooks/use-game-client'
import { isVotePhase } from './lib/phase-view'
import { DayPage } from './pages/day-page'
import { DisconnectPage } from './pages/disconnect-page'
import { EndPage } from './pages/end-page'
import { JoinPage } from './pages/join-page'
import { LobbyPage } from './pages/lobby-page'
import { NightPage } from './pages/night-page'
import { RolePage } from './pages/role-page'

const DISABLED_HINT = '当前阶段或身份不允许该操作，请等待系统推进。'

const connectionText: Record<string, string> = {
  IDLE: '未连接',
  JOINING: '加入中',
  CONNECTING: '连接中',
  CONNECTED: '已连接',
  DISCONNECTED: '已断线'
}

function App() {
  const [isHelpOpen, setHelpOpen] = useState(false)
  const game = useGameClient()

  const canStartGame = useMemo(() => {
    if (!game.session?.isHost) {
      return false
    }

    if (!game.snapshot) {
      return false
    }

    const playerCount = game.snapshot.players.length

    return (
      game.connectionStatus === 'CONNECTED' &&
      game.snapshot.status === 'WAITING' &&
      playerCount >= 6 &&
      playerCount <= 12
    )
  }, [game.connectionStatus, game.session, game.snapshot])

  const startDisabledReason = useMemo(() => {
    if (!game.session?.isHost) {
      return '仅主机可以开始游戏。'
    }

    if (!game.snapshot) {
      return '等待房间快照同步。'
    }

    const playerCount = game.snapshot.players.length

    if (playerCount < 6 || playerCount > 12) {
      return '标准模式仅支持 6-12 人开局。'
    }

    if (game.connectionStatus !== 'CONNECTED') {
      return '连接未就绪，无法开始。'
    }

    if (game.snapshot.status !== 'WAITING') {
      return '当前对局已开始。'
    }

    return null
  }, [game.connectionStatus, game.session, game.snapshot])

  const openHelpModal = () => {
    setHelpOpen(true)
    game.requestHelp()
  }

  const canAdvanceDayPhase = (phase: string) => {
    if (game.connectionStatus !== 'CONNECTED') {
      return false
    }

    return (
      phase === 'DAY_REVEAL' ||
      phase === 'DAY_LAST_WORDS' ||
      phase === 'DAY_DISCUSSION' ||
      phase === 'DAY_VOTE_RESULT' ||
      phase === 'DAY_IDIOT_REVEAL'
    )
  }

  const renderMainView = () => {
    if (game.currentView === 'NO_JOIN') {
      return (
        <JoinPage
          canJoin={false}
          isSubmitting={false}
          onJoin={game.joinGame}
          serverUrl={game.httpBaseUrl}
          errorMessage={game.errorMessage}
        />
      )
    }

    if (game.currentView === 'JOIN') {
      return (
        <JoinPage
          canJoin={true}
          isSubmitting={
            game.connectionStatus === 'JOINING' ||
            game.connectionStatus === 'CONNECTING'
          }
          onJoin={game.joinGame}
          serverUrl={game.httpBaseUrl}
          errorMessage={game.errorMessage}
        />
      )
    }

    if (!game.snapshot || !game.session) {
      return (
        <section className="screen">
          <article className="panel stack">
            <h2 className="panel-title">等待同步</h2>
            <p className="muted">正在接收房间快照，请稍候。</p>
          </article>
        </section>
      )
    }

    if (game.currentView === 'LOBBY') {
      return (
        <LobbyPage
          snapshot={game.snapshot}
          isHost={game.session.isHost}
          canStartGame={canStartGame}
          startDisabledReason={startDisabledReason}
          onStartGame={game.startGame}
          pendingDisconnects={game.pendingDisconnects}
        />
      )
    }

    if (game.currentView === 'ROLE') {
      return (
        <RolePage
          phase={game.snapshot.phase}
          roleInfo={game.roleInfo}
          canConfirm={game.snapshot.phase === 'ROLE_VIEW'}
          onConfirmRole={game.confirmRoleView}
          disabledHint={DISABLED_HINT}
        />
      )
    }

    if (game.currentView === 'NIGHT') {
      return (
        <NightPage
          key={game.snapshot.phase}
          phase={game.snapshot.phase}
          players={game.snapshot.players}
          roleInfo={game.roleInfo}
          selfPlayerId={game.session.playerId}
          disabledHint={DISABLED_HINT}
          onSubmitWolfKill={game.submitWolfKill}
          onSubmitSeerCheck={game.submitSeerCheck}
          onSubmitGuardProtect={game.submitGuardProtect}
          onSubmitWitchAction={game.submitWitchAction}
        />
      )
    }

    if (game.currentView === 'DAY') {
      return (
        <DayPage
          key={game.snapshot.phase}
          phase={game.snapshot.phase}
          players={game.snapshot.players}
          roleInfo={game.roleInfo}
          selfPlayerId={game.session.playerId}
          deaths={game.dayDeaths}
          voteResult={game.voteResult}
          canSubmitVote={
            isVotePhase(game.snapshot.phase) && game.connectionStatus === 'CONNECTED'
          }
          canAdvancePhase={canAdvanceDayPhase(game.snapshot.phase)}
          disabledHint={DISABLED_HINT}
          onAdvancePhase={game.advancePhase}
          onSubmitVote={game.submitDayVote}
          onSubmitHunterShot={game.submitHunterShot}
        />
      )
    }

    if (game.currentView === 'END') {
      return (
        <EndPage
          snapshot={game.snapshot}
          gameOverInfo={game.gameOverInfo}
        />
      )
    }

    return (
      <DisconnectPage
        countdownSec={game.disconnectCountdownSec}
        onReconnect={game.manualReconnect}
      />
    )
  }

  return (
    <div className="app-root">
      <div className="phone-shell">
        {game.runtimeMode === 'MOCK' ? (
          <p className="banner banner-info">
            当前为 Mock 演示模式：地址加 `?mock=0` 可切回真实联调。
          </p>
        ) : null}

        {game.session ? (
          <header className="window-head">
            <div className="window-title">
              <span>Wolf Night Party</span>
              <span className={`status status-${game.connectionStatus.toLowerCase()}`}>
                {connectionText[game.connectionStatus]}
              </span>
            </div>
            <div className="head-row">
              <p className="meta">
                房间 {game.snapshot?.roomId ?? 'room_local'} · 阶段{' '}
                {game.snapshot?.phase ?? 'WAITING'}
              </p>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={openHelpModal}>
                ❓帮助
              </button>
            </div>
          </header>
        ) : null}

        {game.infoMessage ? (
          <p className="banner banner-info">{game.infoMessage}</p>
        ) : null}

        {game.errorMessage ? (
          <button
            className="banner banner-error"
            type="button"
            onClick={game.clearErrorMessage}>
            {game.errorMessage}
          </button>
        ) : null}

        <main className="app-main">{renderMainView()}</main>
      </div>

      <HelpModal
        open={isHelpOpen}
        onClose={() => setHelpOpen(false)}
        remoteHelpSummary={game.remoteHelpSummary}
      />
    </div>
  )
}

export default App
