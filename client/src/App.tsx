import { useEffect, useMemo, useState } from 'react'

import { HelpModal } from './components/help-modal'
import { SeerLogModal } from './components/seer-log-modal'
import { VoteResultModal } from './components/vote-result-modal'
import { WitchKillLogModal } from './components/witch-kill-log-modal'
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
const ROLE_CONFIRM_PENDING_HINT = '请等待别的玩家确认身份。'

const connectionText: Record<string, string> = {
  IDLE: '未连接',
  JOINING: '加入中',
  CONNECTING: '连接中',
  CONNECTED: '已连接',
  DISCONNECTED: '已断线'
}

function App() {
  const [isHelpOpen, setHelpOpen] = useState(false)
  const [isSeerLogOpen, setSeerLogOpen] = useState(false)
  const [isVoteResultOpen, setVoteResultOpen] = useState(false)
  const [isWitchKillLogOpen, setWitchKillLogOpen] = useState(false)
  const [roleConfirmSubmitted, setRoleConfirmSubmitted] = useState(false)
  const game = useGameClient()

  useEffect(() => {
    if (game.currentView !== 'ROLE' || game.snapshot?.phase !== 'ROLE_VIEW') {
      setRoleConfirmSubmitted(false)
    }
  }, [game.currentView, game.snapshot?.phase])

  useEffect(() => {
    if (game.pendingSeerResult) {
      setSeerLogOpen(true)
    }
  }, [game.pendingSeerResult])

  useEffect(() => {
    if (game.voteResult) {
      setVoteResultOpen(true)
    }
  }, [game.voteResult])

  useEffect(() => {
    if (game.pendingWitchKillHint) {
      setWitchKillLogOpen(true)
    }
  }, [game.pendingWitchKillHint])

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

  const canStartNewRound = useMemo(() => {
    if (!game.session?.isHost || !game.snapshot) {
      return false
    }

    const playerCount = game.snapshot.players.length

    return (
      game.connectionStatus === 'CONNECTED' &&
      game.snapshot.status === 'ENDED' &&
      playerCount >= 6 &&
      playerCount <= 12
    )
  }, [game.connectionStatus, game.session, game.snapshot])

  const restartDisabledReason = useMemo(() => {
    if (!game.session?.isHost) {
      return '仅主机可以开始新一局。'
    }

    if (!game.snapshot) {
      return '等待房间快照同步。'
    }

    if (game.connectionStatus !== 'CONNECTED') {
      return '连接未就绪，无法开始。'
    }

    if (game.snapshot.status !== 'ENDED') {
      return '仅可在已结束对局中开启新一局。'
    }

    const playerCount = game.snapshot.players.length

    if (playerCount < 6 || playerCount > 12) {
      return '标准模式仅支持 6-12 人开局。'
    }

    return null
  }, [game.connectionStatus, game.session, game.snapshot])

  const openHelpModal = () => {
    setHelpOpen(true)
    game.requestHelp()
  }

  const closeSeerLogModal = () => {
    setSeerLogOpen(false)
    game.dismissSeerResult()
  }

  const closeWitchKillLogModal = () => {
    setWitchKillLogOpen(false)
    game.dismissWitchKillHint()
  }

  const canAdvanceDayPhase = (phase: string) => {
    if (game.connectionStatus !== 'CONNECTED') {
      return false
    }

    if (
      (phase === 'DAY_REVEAL' ||
        phase === 'DAY_PK_SPEECH' ||
        phase === 'DAY_LAST_WORDS' ||
        phase === 'DAY_DISCUSSION' ||
        phase === 'DAY_VOTE_RESULT') &&
      !game.session?.isHost
    ) {
      return false
    }

    return (
      phase === 'DAY_REVEAL' ||
      phase === 'DAY_PK_SPEECH' ||
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
      const canConfirmRole =
        game.snapshot.phase === 'ROLE_VIEW' && !roleConfirmSubmitted
      const roleDisabledHint = roleConfirmSubmitted
        ? ROLE_CONFIRM_PENDING_HINT
        : DISABLED_HINT

      return (
        <RolePage
          phase={game.snapshot.phase}
          roleInfo={game.roleInfo}
          canConfirm={canConfirmRole}
          onConfirmRole={() => {
            setRoleConfirmSubmitted(true)
            game.confirmRoleView()
          }}
          disabledHint={roleDisabledHint}
        />
      )
    }

    if (game.currentView === 'NIGHT') {
      const session = game.session
      if (!session) {
        return null
      }

      const selfPlayer = game.snapshot.players.find((player) => {
        return player.id === session.playerId
      })
      const isSelfAlive = selfPlayer?.alive ?? false

      return (
        <NightPage
          key={game.snapshot.phase}
          phase={game.snapshot.phase}
          players={game.snapshot.players}
          roleInfo={game.roleInfo}
          wolfVoteHints={game.wolfVoteHints}
          latestWitchKillHint={game.witchKillHints[0] ?? null}
          witchOptions={game.witchOptions}
          selfPlayerId={session.playerId}
          isSelfAlive={isSelfAlive}
          canAdvanceWhenDead={
            !isSelfAlive && session.isHost && game.connectionStatus === 'CONNECTED'
          }
          disabledHint={DISABLED_HINT}
          onSubmitWolfKill={game.submitWolfKill}
          onSubmitSeerCheck={game.submitSeerCheck}
          onSubmitGuardProtect={game.submitGuardProtect}
          onSubmitWitchAction={game.submitWitchAction}
          onAdvancePhase={game.advancePhase}
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
          revoteCandidates={game.revoteCandidates}
          canSubmitVote={
            isVotePhase(game.snapshot.phase) && game.connectionStatus === 'CONNECTED'
          }
          voteCountdownSec={game.voteCountdownSec}
          canAdvancePhase={canAdvanceDayPhase(game.snapshot.phase)}
          disabledHint={
            (game.snapshot.phase === 'DAY_REVEAL' ||
              game.snapshot.phase === 'DAY_PK_SPEECH' ||
              game.snapshot.phase === 'DAY_LAST_WORDS' ||
              game.snapshot.phase === 'DAY_DISCUSSION' ||
              game.snapshot.phase === 'DAY_VOTE_RESULT') &&
            !game.session.isHost
              ? '仅主机可以推进当前阶段。'
              : DISABLED_HINT
          }
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
          isHost={game.session.isHost}
          canStartNewGame={canStartNewRound}
          startDisabledReason={restartDisabledReason}
          onStartNewGame={game.startGame}
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
                {game.snapshot?.phase ?? 'WAITING'} · 身份{' '}
                {game.roleInfo?.role ?? '待分配'}
              </p>
              {game.roleInfo?.role === 'SEER' && game.seerChecks.length > 0 ? (
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setSeerLogOpen(true)}>
                  👁️查验记录
                </button>
              ) : null}
              {game.roleInfo?.role === 'WITCH' && game.witchKillHints.length > 0 ? (
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setWitchKillLogOpen(true)}>
                  🧪刀口记录
                </button>
              ) : null}
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
      <SeerLogModal
        open={isSeerLogOpen}
        latest={game.pendingSeerResult}
        history={game.seerChecks}
        onClose={closeSeerLogModal}
      />
      <WitchKillLogModal
        open={isWitchKillLogOpen}
        latest={game.pendingWitchKillHint}
        history={game.witchKillHints}
        onClose={closeWitchKillLogModal}
      />
      <VoteResultModal
        open={isVoteResultOpen}
        result={game.voteResult}
        onClose={() => setVoteResultOpen(false)}
      />
    </div>
  )
}

export default App
