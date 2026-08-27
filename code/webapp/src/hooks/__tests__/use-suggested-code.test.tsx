/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSuggestedCode } from '../use-suggested-code'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client }, children)
}

describe('useSuggestedCode', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('does not fetch while disabled', () => {
    const fetcher = vi.fn()
    const { result } = renderHook(
      () => useSuggestedCode(['x'], fetcher, false),
      { wrapper },
    )

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current.suggestedCode).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
  })

  it('exposes the fetched code and prefix once enabled', async () => {
    const fetcher = vi.fn().mockResolvedValue({ code: 'PROV-014', prefix: 'PROV-' })
    const { result } = renderHook(
      () => useSuggestedCode(['suppliers', 'next-code'], fetcher, true),
      { wrapper },
    )

    await waitFor(() => expect(result.current.suggestedCode).toBe('PROV-014'))
    expect(result.current.prefix).toBe('PROV-')
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('re-fetches on refresh', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ code: 'PROV-014', prefix: 'PROV-' })
      .mockResolvedValueOnce({ code: 'PROV-021', prefix: 'PROV-' })
    const { result } = renderHook(
      () => useSuggestedCode(['suppliers', 'next-code'], fetcher, true),
      { wrapper },
    )

    await waitFor(() => expect(result.current.suggestedCode).toBe('PROV-014'))
    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.suggestedCode).toBe('PROV-021'))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('reports the error state when the fetch fails', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'))
    const { result } = renderHook(
      () => useSuggestedCode(['suppliers', 'next-code'], fetcher, true),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.suggestedCode).toBeUndefined()
  })
})
