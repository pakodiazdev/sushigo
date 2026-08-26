/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useReceiptDetails } from '../use-receipt-details'

describe('useReceiptDetails', () => {
  afterEach(() => cleanup())

  it('toggles each confirm dialog independently', () => {
    const { result } = renderHook(() => useReceiptDetails())

    act(() => result.current.setShowDeleteConfirm(true))
    expect(result.current.showDeleteConfirm).toBe(true)

    act(() => result.current.setShowPostConfirm(true))
    expect(result.current.showPostConfirm).toBe(true)

    act(() => result.current.setShowReverseConfirm(true))
    expect(result.current.showReverseConfirm).toBe(true)
  })

  it('resets the reverse reason each time the reverse confirm opens', () => {
    const { result } = renderHook(() => useReceiptDetails())

    act(() => result.current.setReverseReason('Motivo previo'))
    expect(result.current.reverseReason).toBe('Motivo previo')

    act(() => result.current.openReverseConfirm())
    expect(result.current.reverseReason).toBe('')
    expect(result.current.showReverseConfirm).toBe(true)
  })
})
