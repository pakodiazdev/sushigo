import { describe, it, expect, vi, beforeEach } from 'vitest'
import { attendanceApi } from '@/services/attendance-api'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import { apiClient } from '@/lib/api-client'

// ── attendanceApi.daily ────────────────────────────────────────────────────────

describe('attendanceApi.daily', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls GET /attendances/today with branch_id param', async () => {
    const mockResponse = {
      data: {
        data: [
          { employee: { id: '1', first_name: 'Carlos', last_name: 'Mendoza' }, attendance: null },
        ],
      },
    }
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse as never)

    const result = await attendanceApi.daily(5)

    expect(apiClient.get).toHaveBeenCalledWith('/attendances/today', {
      params: { branch_id: 5 },
    })
    expect(result).toEqual(mockResponse)
  })

  it('passes optional date param when provided', async () => {
    await attendanceApi.daily(10, '2026-06-23')
    expect(apiClient.get).toHaveBeenCalledWith('/attendances/today', {
      params: { branch_id: 10, date: '2026-06-23' },
    })
  })

  it('omits date param when not provided', async () => {
    await attendanceApi.daily(1)
    expect(apiClient.get).toHaveBeenCalledWith('/attendances/today', {
      params: { branch_id: 1 },
    })
  })
})

// ── attendanceApi.checkIn ──────────────────────────────────────────────────────

describe('attendanceApi.checkIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /attendances/check-in with employee_id and check_in', async () => {
    const mockResponse = {
      data: {
        status: 201,
        data: {
          id: 'att-123',
          employee_id: 'emp-001',
          check_in: '2026-04-01T13:00:00-06:00',
        },
      },
    }
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse as never)

    const payload = {
      employee_id: 'emp-001',
      check_in: '2026-04-01T13:00:00-06:00',
    }
    const result = await attendanceApi.checkIn(payload)

    expect(apiClient.post).toHaveBeenCalledWith('/attendances/check-in', payload)
    expect(result).toEqual(mockResponse)
  })

  it('sends the exact datetime string provided', async () => {
    const isoTime = '2026-04-01T14:30:00+00:00'
    await attendanceApi.checkIn({ employee_id: 'xyz', check_in: isoTime })

    expect(apiClient.post).toHaveBeenCalledWith('/attendances/check-in', {
      employee_id: 'xyz',
      check_in: isoTime,
    })
  })
})

// ── attendanceApi.lunchStart ───────────────────────────────────────────────────

describe('attendanceApi.lunchStart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PATCH /attendances/{id}/lunch-start with lunch_start', async () => {
    const mockResponse = {
      data: {
        status: 200,
        data: {
          id: 'att-123',
          lunch_start: '2026-04-01T14:00:00-06:00',
        },
      },
    }
    vi.mocked(apiClient.patch).mockResolvedValueOnce(mockResponse as never)

    const result = await attendanceApi.lunchStart('att-123', {
      lunch_start: '2026-04-01T14:00:00-06:00',
    })

    expect(apiClient.patch).toHaveBeenCalledWith('/attendances/att-123/lunch-start', {
      lunch_start: '2026-04-01T14:00:00-06:00',
    })
    expect(result).toEqual(mockResponse)
  })

  it('interpolates the attendanceId into the URL', async () => {
    await attendanceApi.lunchStart('my-attendance-id', { lunch_start: '2026-04-01T15:00:00-06:00' })

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/attendances/my-attendance-id/lunch-start',
      { lunch_start: '2026-04-01T15:00:00-06:00' }
    )
  })

  it('handles different attendance IDs correctly', async () => {
    await attendanceApi.lunchStart('abc', { lunch_start: '2026-04-01T12:00:00Z' })
    expect(apiClient.patch).toHaveBeenCalledWith('/attendances/abc/lunch-start', expect.any(Object))

    await attendanceApi.lunchStart('def-456', { lunch_start: '2026-04-01T13:00:00Z' })
    expect(apiClient.patch).toHaveBeenCalledWith('/attendances/def-456/lunch-start', expect.any(Object))
  })
})

// ── attendanceApi.lunchReturn ──────────────────────────────────────────────────

describe('attendanceApi.lunchReturn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PATCH /attendances/{id}/lunch-return with lunch_end', async () => {
    const mockResponse = {
      data: {
        status: 200,
        data: {
          id: 'att-123',
          lunch_end: '2026-04-01T15:00:00-06:00',
        },
      },
    }
    vi.mocked(apiClient.patch).mockResolvedValueOnce(mockResponse as never)

    const result = await attendanceApi.lunchReturn('att-123', {
      lunch_end: '2026-04-01T15:00:00-06:00',
    })

    expect(apiClient.patch).toHaveBeenCalledWith('/attendances/att-123/lunch-return', {
      lunch_end: '2026-04-01T15:00:00-06:00',
    })
    expect(result).toEqual(mockResponse)
  })

  it('interpolates the attendanceId into the URL', async () => {
    await attendanceApi.lunchReturn('my-attendance-id', { lunch_end: '2026-04-01T16:00:00-06:00' })

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/attendances/my-attendance-id/lunch-return',
      { lunch_end: '2026-04-01T16:00:00-06:00' }
    )
  })

  it('handles different attendance IDs correctly', async () => {
    await attendanceApi.lunchReturn('abc', { lunch_end: '2026-04-01T14:00:00Z' })
    expect(apiClient.patch).toHaveBeenCalledWith('/attendances/abc/lunch-return', expect.any(Object))

    await attendanceApi.lunchReturn('def-456', { lunch_end: '2026-04-01T15:00:00Z' })
    expect(apiClient.patch).toHaveBeenCalledWith('/attendances/def-456/lunch-return', expect.any(Object))
  })
})

// ── attendanceApi.checkOut ───────────────────────────────────────────────────

describe('attendanceApi.checkOut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PATCH /attendances/{id}/check-out with check_out', async () => {
    const mockResponse = {
      data: {
        status: 200,
        data: {
          id: 'att-123',
          check_out: '2026-04-01T22:00:00-06:00',
          net_worked_minutes: 420,
          overtime_minutes: 0,
        },
      },
    }
    vi.mocked(apiClient.patch).mockResolvedValueOnce(mockResponse as never)

    const result = await attendanceApi.checkOut('att-123', {
      check_out: '2026-04-01T22:00:00-06:00',
    })

    expect(apiClient.patch).toHaveBeenCalledWith('/attendances/att-123/check-out', {
      check_out: '2026-04-01T22:00:00-06:00',
    })
    expect(result).toEqual(mockResponse)
  })

  it('interpolates the attendanceId into the URL', async () => {
    await attendanceApi.checkOut('my-attendance-id', { check_out: '2026-04-01T17:00:00-06:00' })

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/attendances/my-attendance-id/check-out',
      { check_out: '2026-04-01T17:00:00-06:00' }
    )
  })
})

// ── attendanceApi.overtimeDecision ──────────────────────────────────────────

describe('attendanceApi.overtimeDecision', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PATCH /attendances/{id}/overtime-decision with authorize payload', async () => {
    const mockResponse = {
      data: {
        status: 200,
        data: { id: 'att-123', overtime_authorized: true, overtime_authorized_at: '2026-04-01T22:00:00Z' },
      },
    }
    vi.mocked(apiClient.patch).mockResolvedValueOnce(mockResponse as never)

    const result = await attendanceApi.overtimeDecision('att-123', {
      authorize: true,
      valuation_method: 'LFT_PROPORTIONAL',
    })

    expect(apiClient.patch).toHaveBeenCalledWith('/attendances/att-123/overtime-decision', {
      authorize: true,
      valuation_method: 'LFT_PROPORTIONAL',
    })
    expect(result).toEqual(mockResponse)
  })

  it('interpolates the attendanceId into the URL', async () => {
    await attendanceApi.overtimeDecision('my-att-id', { authorize: false })

    expect(apiClient.patch).toHaveBeenCalledWith('/attendances/my-att-id/overtime-decision', { authorize: false })
  })

  it('sends authorize: false for reject decision', async () => {
    await attendanceApi.overtimeDecision('att-456', { authorize: false })
    expect(apiClient.patch).toHaveBeenCalledWith('/attendances/att-456/overtime-decision', { authorize: false })
  })

  it('sends valuation_method and agreed_rate when authorizing with AGREED_RATE', async () => {
    await attendanceApi.overtimeDecision('att-789', {
      authorize: true,
      valuation_method: 'AGREED_RATE',
      agreed_rate: 90,
    })

    expect(apiClient.patch).toHaveBeenCalledWith('/attendances/att-789/overtime-decision', {
      authorize: true,
      valuation_method: 'AGREED_RATE',
      agreed_rate: 90,
    })
  })
})

// ── attendanceApi.markDayStatus ──────────────────────────────────────────────

describe('attendanceApi.markDayStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /attendances/day-status with employee_id, date and day_status', async () => {
    const mockResponse = { data: { status: 200, data: { id: 'att-789', day_status: 'ABSENCE' } } }
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse as never)

    const payload = { employee_id: 'emp-001', date: '2026-04-02', day_status: 'ABSENCE' as const }
    const result = await attendanceApi.markDayStatus(payload)

    expect(apiClient.post).toHaveBeenCalledWith('/attendances/day-status', payload)
    expect(result).toEqual(mockResponse)
  })

  it('sends the exact payload provided', async () => {
    await attendanceApi.markDayStatus({ employee_id: 'emp-xyz', date: '2026-01-15', day_status: 'ABSENCE' })

    expect(apiClient.post).toHaveBeenCalledWith('/attendances/day-status', {
      employee_id: 'emp-xyz',
      date: '2026-01-15',
      day_status: 'ABSENCE',
    })
  })
})

// ── attendanceApi.closeDay ───────────────────────────────────────────────────

describe('attendanceApi.closeDay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /attendances/close-day with request data', async () => {
    const mockResponse = {
      data: {
        status: 200,
        data: { lunch_returns: 2, check_outs: 5, absences: 1 },
      },
    }
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse as never)

    const payload = {
      branch_id: 1,
      close_time: '22:00',
      lunch_returns: [
        { attendance_id: 'att-001', lunch_end: '15:00' },
      ],
    }
    const result = await attendanceApi.closeDay(payload)

    expect(apiClient.post).toHaveBeenCalledWith('/attendances/close-day', payload)
    expect(result).toEqual(mockResponse)
  })

  it('sends request without lunch_returns when not provided', async () => {
    await attendanceApi.closeDay({ branch_id: 1, close_time: '17:00' })

    expect(apiClient.post).toHaveBeenCalledWith('/attendances/close-day', {
      branch_id: 1,
      close_time: '17:00',
    })
  })
})

// ── attendanceApi.previewOvertimeValuation ──────────────────────────────────

describe('attendanceApi.previewOvertimeValuation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls GET /attendances/{id}/overtime-preview with query params', async () => {
    const mockResponse = {
      data: { status: 200, data: { valuation_method: 'SALARY_FACTOR', rate_applied: 1.5, amount: 180, accumulated_hours: null } },
    }
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse as never)

    const result = await attendanceApi.previewOvertimeValuation('att-123', {
      valuation_method: 'SALARY_FACTOR',
      agreed_factor: 1.5,
    })

    expect(apiClient.get).toHaveBeenCalledWith('/attendances/att-123/overtime-preview', {
      params: { valuation_method: 'SALARY_FACTOR', agreed_factor: 1.5 },
    })
    expect(result).toEqual(mockResponse)
  })
})
