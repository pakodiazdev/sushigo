// @vitest-environment jsdom
/**
 * negotiated-extra-day-api tests
 *
 * Tests for the negotiated extra day API service.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mock api-client ──────────────────────────────────────────────────────────

const mockPost = vi.fn()
const mockGet = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    get: (...args: unknown[]) => mockGet(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
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

// ─── list ────────────────────────────────────────────────────────────────────

describe('negotiatedExtraDayApi.list', () => {
  const paginatedResponse = {
    data: {
      status: 'ok',
      data: [
        {
          id: 'ned-1',
          employee_id: 'emp-1',
          branch_id: 1,
          date: '2026-06-15',
          agreed_daily_wage: 800,
          prima_percent: 75,
          prima_amount: 600,
          approved_by: 'mgr-1',
          status: 'APPROVED',
          notes: null,
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
    },
  }

  beforeEach(() => {
    mockGet.mockResolvedValue(paginatedResponse)
  })

  it('calls GET /employees/:id/negotiated-extra-days', async () => {
    await negotiatedExtraDayApi.list('emp-1')
    expect(mockGet).toHaveBeenCalledWith('/employees/emp-1/negotiated-extra-days', { params: undefined })
  })

  it('passes filters as query params', async () => {
    const filters = { date_from: '2026-06-01', date_to: '2026-06-30', per_page: 50 }
    await negotiatedExtraDayApi.list('emp-1', filters)
    expect(mockGet).toHaveBeenCalledWith('/employees/emp-1/negotiated-extra-days', { params: filters })
  })

  it('returns the full paginated response', async () => {
    const result = await negotiatedExtraDayApi.list('emp-1')
    expect(result.status).toBe('ok')
    expect(result.data).toHaveLength(1)
    expect(result.meta.total).toBe(1)
  })

  it('propagates errors from the API', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))
    await expect(negotiatedExtraDayApi.list('emp-1')).rejects.toThrow('Network error')
  })
})

// ─── cancel ──────────────────────────────────────────────────────────────────

describe('negotiatedExtraDayApi.cancel', () => {
  beforeEach(() => {
    mockDelete.mockResolvedValue({ data: { data: null, status: 'ok' } })
  })

  it('calls DELETE /negotiated-extra-days/:id', async () => {
    await negotiatedExtraDayApi.cancel('ned-abc')
    expect(mockDelete).toHaveBeenCalledWith('/negotiated-extra-days/ned-abc')
  })

  it('resolves without a return value on success', async () => {
    const result = await negotiatedExtraDayApi.cancel('ned-abc')
    expect(result).toBeUndefined()
  })

  it('propagates errors from the API', async () => {
    mockDelete.mockRejectedValue(new Error('Not Found'))
    await expect(negotiatedExtraDayApi.cancel('bad-id')).rejects.toThrow('Not Found')
  })
})
