import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addMinutesToTime, toApiPayload, scheduleApi } from '@/services/schedule-api'
import type { CreateScheduleFormValues } from '@/types/schedule'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

// ── addMinutesToTime ──────────────────────────────────────────────────────────

describe('addMinutesToTime', () => {
  it('adds minutes within the same hour', () => {
    expect(addMinutesToTime('08:00', 30)).toBe('08:30')
  })

  it('crosses hour boundary', () => {
    expect(addMinutesToTime('08:45', 30)).toBe('09:15')
  })

  it('wraps around midnight', () => {
    expect(addMinutesToTime('23:30', 60)).toBe('00:30')
  })

  it('adds 0 minutes returns same time', () => {
    expect(addMinutesToTime('14:00', 0)).toBe('14:00')
  })

  it('pads single-digit hours and minutes', () => {
    expect(addMinutesToTime('08:05', 5)).toBe('08:10')
  })
})

// ── toApiPayload ──────────────────────────────────────────────────────────────

function makeDay(overrides: Partial<CreateScheduleFormValues['days'][0]> = {}): CreateScheduleFormValues['days'][0] {
  return {
    day_of_week: 1,
    is_day_off: false,
    expected_start: '08:00',
    expected_lunch_start: '13:00',
    lunch_duration_minutes: '60',
    expected_end: '17:00',
    ...overrides,
  }
}

describe('toApiPayload', () => {
  const baseForm: CreateScheduleFormValues = {
    effective_from: '2026-03-01',
    workday_type: 'FULL',
    working_days_per_week: '6',
    days: [makeDay()],
  }

  it('maps effective_from and workday_type', () => {
    const result = toApiPayload(baseForm)
    expect(result.effective_from).toBe('2026-03-01')
    expect(result.workday_type).toBe('FULL')
  })

  it('converts working_days_per_week to number', () => {
    const result = toApiPayload(baseForm)
    expect(result.working_days_per_week).toBe(6)
  })

  it('computes lunch_end from lunch_start + duration', () => {
    const result = toApiPayload(baseForm)
    const day = result.days[0]!
    expect(day.expected_lunch_start).toBe('13:00')
    expect(day.expected_lunch_end).toBe('14:00')
    expect(day.lunch_duration_minutes).toBe(60)
  })

  it('sets lunch fields to null for day-off', () => {
    const form = { ...baseForm, days: [makeDay({ is_day_off: true })] }
    const day = toApiPayload(form).days[0]!
    expect(day.expected_start).toBeNull()
    expect(day.expected_end).toBeNull()
    expect(day.expected_lunch_start).toBeNull()
    expect(day.expected_lunch_end).toBeNull()
    expect(day.lunch_duration_minutes).toBeNull()
  })

  it('sets lunch_end to null when no lunch_start', () => {
    const form = { ...baseForm, days: [makeDay({ expected_lunch_start: '' })] }
    const day = toApiPayload(form).days[0]!
    expect(day.expected_lunch_end).toBeNull()
  })

  it('sets lunch_end to null when no lunch_duration', () => {
    const form = { ...baseForm, days: [makeDay({ lunch_duration_minutes: '' })] }
    const day = toApiPayload(form).days[0]!
    expect(day.lunch_duration_minutes).toBeNull()
    expect(day.expected_lunch_end).toBeNull()
  })
})

// ── scheduleApi methods ───────────────────────────────────────────────────────

const baseForm: CreateScheduleFormValues = {
  effective_from: '2026-03-01',
  workday_type: 'FULL',
  working_days_per_week: '6',
  days: [makeDay()],
}

describe('scheduleApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('create calls POST with toApiPayload result', async () => {
    const { apiClient } = await import('@/lib/api-client')
    await scheduleApi.create('period-1', baseForm)
    expect(apiClient.post).toHaveBeenCalledWith(
      '/employment-periods/period-1/schedules',
      expect.objectContaining({ effective_from: '2026-03-01' })
    )
  })

  it('getCurrent calls GET for employee current schedule', async () => {
    const { apiClient } = await import('@/lib/api-client')
    await scheduleApi.getCurrent('emp-1')
    expect(apiClient.get).toHaveBeenCalledWith('/employees/emp-1/current-schedule')
  })

  it('createPayload calls POST with raw payload', async () => {
    const { apiClient } = await import('@/lib/api-client')
    const payload = {
      effective_from: '2026-03-01',
      workday_type: 'FULL',
      working_days_per_week: 6,
      days: [],
    }
    await scheduleApi.createPayload('period-1', payload)
    expect(apiClient.post).toHaveBeenCalledWith('/employment-periods/period-1/schedules', payload)
  })

  it('createDayOverride calls POST to schedule-day-overrides', async () => {
    const { apiClient } = await import('@/lib/api-client')
    const payload = {
      day_of_week: 3,
      effective_from: '2026-03-19',
      effective_to: null,
      is_day_off: false,
      expected_start: '08:00',
      expected_lunch_start: null,
      expected_lunch_end: null,
      lunch_duration_minutes: null,
      expected_end: '17:00',
      note: null,
    }
    await scheduleApi.createDayOverride('period-1', payload)
    expect(apiClient.post).toHaveBeenCalledWith(
      '/employment-periods/period-1/schedule-day-overrides',
      payload
    )
  })
})
