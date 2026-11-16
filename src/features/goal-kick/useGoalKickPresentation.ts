import { useCallback, useEffect, useRef, useState } from 'react'
import type { GoalKickCommand, GoalKickState } from './contracts'
import { bezier, curvatureAt, directionAt, trajectory, previewContact } from './physics'
import type { Curve, Point } from './physics'

export interface GoalKickFrame { stage: 'DIRECTION' | 'CURVE' | 'SUBMITTING' | 'FLIGHT' | 'RESULT' | 'FINISHED'; targetX: number; curve: number; path: Curve; ball: Point }
export function useGoalKickPresentation(state: GoalKickState & { view: 'player' }, connected: boolean, pending: boolean, send: (command: GoalKickCommand) => void) {
  const control = useRef({ attemptId: '', stage: 'DIRECTION' as 'DIRECTION' | 'CURVE' | 'SUBMITTING', targetX: 500, startedAt: 0 })
  const frameRef = useRef<GoalKickFrame | null>(null)
  const contactRef = useRef({ shotId: '', u: 1 })
  const [local, setLocal] = useState({ attemptId: '', stage: 'DIRECTION' })
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => { const id = window.setInterval(() => setNow(performance.now()), 100); return () => clearInterval(id) }, [])
  const remaining = Math.max(0, Math.ceil((state.endsAt - state.serverNow - (now - state.receivedAt)) / 1000))
  const sample = useCallback((time: number): GoalKickFrame => {
    const serverNow = state.serverNow + time - state.receivedAt
    const { board, shot, lastResult, status } = state.player
    if (control.current.attemptId !== board.attemptId) control.current = { attemptId: board.attemptId, stage: 'DIRECTION', targetX: 500, startedAt: time }
    const chosen = control.current
    let stage: GoalKickFrame['stage'] = state.phase !== 'PLAYING' || serverNow >= state.endsAt ? 'FINISHED' : status === 'READY' ? chosen.stage : status
    if (!connected && stage === 'DIRECTION') stage = 'DIRECTION'
    const targetX = chosen.stage === 'DIRECTION' ? directionAt(Math.max(0, serverNow - board.readyAt)) : chosen.targetX
    const curve = chosen.stage === 'CURVE' ? curvatureAt(time - chosen.startedAt) : 0
    const path = shot?.path ?? trajectory(targetX, curve)
    let ball = board.ballStart
    if (shot) {
      if (contactRef.current.shotId !== shot.shotId) contactRef.current = { shotId: shot.shotId, u: previewContact(shot.path, board.defenders) }
      const u = lastResult?.shotId === shot.shotId ? lastResult.contactU : Math.max(0, Math.min(1, (Math.min(serverNow, state.endsAt) - shot.shotStartedAt) / shot.flightMs))
      ball = bezier(path, Math.min(u, contactRef.current.u))
    }
    const frame = { stage, targetX, curve, path, ball }
    frameRef.current = frame
    return frame
  }, [state, connected])
  const activate = useCallback(() => {
    if (!connected || pending || state.phase !== 'PLAYING' || state.physicsVersion !== 1 || state.player.status !== 'READY' || state.serverNow + performance.now() - state.receivedAt >= state.endsAt) return
    const frame = frameRef.current ?? sample(performance.now())
    if (control.current.stage === 'SUBMITTING') return
    if (control.current.stage === 'DIRECTION') {
      control.current = { attemptId: state.player.board.attemptId, stage: 'CURVE', targetX: frame.targetX, startedAt: performance.now() }
      setLocal({ attemptId: state.player.board.attemptId, stage: 'CURVE' })
    } else if (control.current.stage === 'CURVE') {
      const frozenCurve = frame.stage === 'CURVE' ? frame.curve : 0
      control.current.stage = 'SUBMITTING'; setLocal({ attemptId: state.player.board.attemptId, stage: 'SUBMITTING' })
      send({ action: 'shoot', gameId: state.gameId, attemptId: state.player.board.attemptId, aimX: control.current.targetX, curve: frozenCurve })
    }
  }, [state, connected, pending, sample, send])
  // This is presentation state only. An authoritative READY sync recovers a lost/rejected submit.
  const recover = () => { control.current.stage = 'DIRECTION'; setLocal({ attemptId: state.player.board.attemptId, stage: 'DIRECTION' }); send({ action: 'sync', gameId: state.gameId }) }
  const stage = state.player.status === 'READY' ? (local.attemptId === state.player.board.attemptId ? local.stage : 'DIRECTION') : state.player.status
  return { sample, activate, recover, remaining, stage }
}
