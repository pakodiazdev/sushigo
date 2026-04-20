// @vitest-environment jsdom
/**
 * negotiated-extra-day-api tests
 *
 * Tests for the negotiated extra day API service.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mock api-client ──────────────────────────────────────────────────────────

const mockPost = vi.fn()

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

import { negotiatedExtraDayApi } from '../negotiated-extra-day-api'
import type { RegisterExtraDayPayload } from '@/types/negotiated-extra-day'

afterEach(() => {
  vi.clearAllMocks()
})

// ─── register ────────────────────────────────────────────────────────────────

describe('negotiatedExtraDayApi.register', () => {
  const mockPayload: RegisterExtraDayPayload = {
    employee_id: '1',
    date: '2026-04-20',
    agreed_daily_wage: 200.00,
    prima_percent: 100,
    notes: 'Test extra day',
  }

  const mockResponse = {
    data: {
      data: {
        id: 1,
        employee_id: 1,
        date: '2026-04-20',
        agreed_daily_wage: 200.00,
        prima_percent: 100,
        notes: 'Test extra day',
        approved_by_id: 5,
        created_at: '2026-04-20T10:00:00Z',
        updated_at: '2026-04-20T10:00:00Z',
      },
    },
  }

  beforeEach(() => {
    mockPost.mockResolvedValue(mockResponse)
  })

  it('calls POST /negotiated-extra-days with the payload', async () => {
    await negotiatedExtraDayApi.register(mockPayload)

    expect(mockPost).toHaveBeenCalledTimes(1)
    expect(mockPost).toHaveBeenCalledWith('/negotiated-extra-days', mockPayload)
  })

  it('returns the negotiated extra day data from the response', async () => {
    const result = await negotiatedExtraDayApi.register(mockPayload)

    expect(result).toEqual(mockResponse.data.data)
    expect(result.id).toBe(1)
    expect(result.employee_id).toBe(1)
    expect(result.date).toBe('2026-04-20')
    expect(result.agreed_daily_wage).toBe(200.00)
    expect(result.prima_percent).toBe(100)
  })

  it('propagates errors from the API', async () => {
    const error = new Error('API Error')
    mockPost.mockRejectedValue(error)

    await expect(negotiatedExtraDayApi.register(mockPayload)).rejects.toThrow('API Error')
  })

  it('handles payload without notes', async () => {
    const payloadWithoutNotes: RegisterExtraDayPayload = {
      employee_id: '2',
      date: '2026-04-21',
      agreed_daily_wage: 300.00,
      prima_percent: 50,
    }

    mockPost.mockResolvedValue({
      data: {
        data: {
          id: 2,
          ...payloadWithoutNotes,
          notes: null,
          approved_by_id: 5,
          created_at: '2026-04-21T10:00:00Z',
          updated_at: '2026-04-21T10:00:00Z',
        },
      },
    })

    const result = await negotiatedExtraDayApi.register(payloadWithoutNotes)

    expect(result.id).toBe(2)
    expect(result.notes).toBeNull()
  })
})
