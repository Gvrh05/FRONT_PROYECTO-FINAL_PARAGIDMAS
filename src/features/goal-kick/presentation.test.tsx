import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useGoalKickPresentation } from './useGoalKickPresentation'
import { playerFixture } from './test-fixture'
it('requires exactly two clicks, freezes the visible frame and rejects duplicates/late shots', () => {
  let now = 600
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  const send = vi.fn(), state = playerFixture()
  const { result, rerender, unmount } = renderHook(({ state }) => useGoalKickPresentation(state, true, false, send), { initialProps: { state } })
  act(() => { result.current.sample(now); result.current.activate() })
  expect(result.current.stage).toBe('CURVE')
  expect(send).not.toHaveBeenCalled()
  now = 1150
  act(() => { result.current.sample(now); result.current.activate(); result.current.activate() })
  expect(send).toHaveBeenCalledTimes(1)
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ action: 'shoot', aimX: 500, curve: 260 }))
  const next = { ...state, revision: 3, player: { ...state.player, board: { ...state.player.board, attemptId: '33333333-3333-4333-8333-333333333333' } } }
  rerender({ state: next })
  act(() => { result.current.sample(now) })
  expect(result.current.stage).toBe('DIRECTION')
  now = 42000
  act(() => result.current.activate())
  expect(send).toHaveBeenCalledTimes(1)
  unmount()
})
