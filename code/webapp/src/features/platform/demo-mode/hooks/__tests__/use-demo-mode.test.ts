// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDemoMode } from '../use-demo-mode'

vi.mock('../../api/app-info-api', () => ({
  appInfoApi: { get: vi.fn() },
  appInfoQueryKeys: { all: ['app-info'] },
}))

import { appInfoApi } from '../../api/app-info-api'

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
}

const response = (data: Record<string, unknown>) => ({ data: { status: 200, meta: null, data } })

describe('useDemoMode', () => {
  beforeEach(() => {
    client.clear()
    vi.mocked(appInfoApi.get).mockReset()
  })
  afterEach(cleanup)

  it('reports the demo and its public account when the API says so', async () => {
    vi.mocked(appInfoApi.get).mockResolvedValue(
      response({ environment: 'demo', is_demo: true, data_resets: true, demo_account: { email: 'demo@sushigo.com' } }) as never,
    )

    const { result } = renderHook(() => useDemoMode(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isDemo).toBe(true))
    expect(result.current.dataResets).toBe(true)
    expect(result.current.demoEmail).toBe('demo@sushigo.com')
  })

  it('is not the demo outside the demo environment', async () => {
    vi.mocked(appInfoApi.get).mockResolvedValue(
      response({ environment: 'preview', is_demo: false, data_resets: false, demo_account: null }) as never,
    )

    const { result } = renderHook(() => useDemoMode(), { wrapper: wrapper() })

    await waitFor(() => expect(client.getQueryState(['app-info'])?.status).toBe('success'))
    expect(result.current).toEqual({ isDemo: false, dataResets: false, demoEmail: null })
  })

  it('falls back to "not the demo" when app-info cannot be loaded', async () => {
    vi.mocked(appInfoApi.get).mockImplementation(() => Promise.reject(new Error('offline')))

    const { result } = renderHook(() => useDemoMode(), { wrapper: wrapper() })

    await waitFor(() => expect(client.getQueryState(['app-info'])?.status).toBe('error'))
    expect(result.current.isDemo).toBe(false)
  })
})
