// @vitest-environment jsdom
/**
 * holiday-api tests
 *
 * Tests for the Holiday API service.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mock api-client ──────────────────────────────────────────────────────────

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

import { holidayApi } from '../holiday-api'
import type { CreateHolidayPayload, UpdateHolidayPayload } from '@/types/attendance-payroll'

afterEach(() => {
  vi.clearAllMocks()
})

const mockHoliday = {
  id: 1,
  date: '2026-01-01',
  name: "New Year's Day",
  pay_multiplier: 2.0,
  created_at: '2026-01-01T00:00:00+00:00',
}

// ─── list ─────────────────────────────────────────────────────────────────────

describe('holidayApi.list', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue({ data: { data: [mockHoliday], status: 200, meta: null } })
  })

  it('calls GET /holidays without params when no year given', async () => {
    await holidayApi.list()
    expect(mockGet).toHaveBeenCalledWith('/holidays', { params: undefined })
  })

  it('passes year as a query param when provided', async () => {
    await holidayApi.list(2026)
    expect(mockGet).toHaveBeenCalledWith('/holidays', { params: { year: 2026 } })
  })

  it('returns the holiday array from response.data.data', async () => {
    const result = await holidayApi.list()
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toEqual(mockHoliday)
  })

  it('returns empty warnings when meta is null', async () => {
    const result = await holidayApi.list()
    expect(result.warnings).toEqual([])
  })

  it('propagates errors from the API', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))
    await expect(holidayApi.list()).rejects.toThrow('Network error')
  })
})

// ─── create ───────────────────────────────────────────────────────────────────

describe('holidayApi.create', () => {
  const payload: CreateHolidayPayload = {
    date: '2026-01-01',
    name: "New Year's Day",
    pay_multiplier: 2.0,
  }

  beforeEach(() => {
    mockPost.mockResolvedValue({ data: { data: mockHoliday } })
  })

  it('calls POST /holidays with the payload', async () => {
    await holidayApi.create(payload)
    expect(mockPost).toHaveBeenCalledWith('/holidays', payload)
  })

  it('returns the created holiday', async () => {
    const result = await holidayApi.create(payload)
    expect(result).toEqual(mockHoliday)
  })

  it('propagates errors from the API', async () => {
    mockPost.mockRejectedValue(new Error('Validation error'))
    await expect(holidayApi.create(payload)).rejects.toThrow('Validation error')
  })
})

// ─── update ───────────────────────────────────────────────────────────────────

describe('holidayApi.update', () => {
  const payload: UpdateHolidayPayload = { name: 'Updated Name', pay_multiplier: 3.0 }
  const updatedHoliday = { ...mockHoliday, name: 'Updated Name', pay_multiplier: 3.0 }

  beforeEach(() => {
    mockPut.mockResolvedValue({ data: { data: updatedHoliday } })
  })

  it('calls PUT /holidays/:id with the payload', async () => {
    await holidayApi.update(1, payload)
    expect(mockPut).toHaveBeenCalledWith('/holidays/1', payload)
  })

  it('returns the updated holiday', async () => {
    const result = await holidayApi.update(1, payload)
    expect(result.name).toBe('Updated Name')
    expect(result.pay_multiplier).toBe(3.0)
  })

  it('propagates errors from the API', async () => {
    mockPut.mockRejectedValue(new Error('Not Found'))
    await expect(holidayApi.update(999, payload)).rejects.toThrow('Not Found')
  })
})

// ─── delete ───────────────────────────────────────────────────────────────────

describe('holidayApi.delete', () => {
  beforeEach(() => {
    mockDelete.mockResolvedValue({ status: 204, data: null })
  })

  it('calls DELETE /holidays/:id', async () => {
    await holidayApi.delete(1)
    expect(mockDelete).toHaveBeenCalledWith('/holidays/1')
  })

  it('resolves without a return value on success', async () => {
    const result = await holidayApi.delete(1)
    expect(result).toBeUndefined()
  })

  it('propagates errors from the API', async () => {
    mockDelete.mockRejectedValue(new Error('Not Found'))
    await expect(holidayApi.delete(999)).rejects.toThrow('Not Found')
  })
})
