import { describe, it, expect } from 'vitest'
import {
    getAttendancePhase,
    isAbsentRow,
    isHiddenFromGrid,
    formatSeconds,
    formatTime,
} from '@/types/attendance'
import type { TodayAttendanceData, TodayAttendanceRow } from '@/types/attendance'

describe('getAttendancePhase', () => {
    it('returns "pending" when attendance is null', () => {
        expect(getAttendancePhase(null)).toBe('pending')
    })

    it('returns "pending" when check_in is null', () => {
        const attendance: TodayAttendanceData = {
            id: '1',
            check_in: null,
            lunch_start: null,
            lunch_end: null,
            check_out: null,
            day_status: 'WORKED',
            entry_late_seconds: null,
            entry_late_minutes: null,
            is_entry_deductible: false,
            overtime_minutes: 0,
            overtime_authorized: false,
            overtime_authorized_at: null,
            overtime_valuation_method: null,
            overtime_rate_applied: null,
            overtime_amount: null,
            requires_overtime_decision: false,
        }
        expect(getAttendancePhase(attendance)).toBe('pending')
    })

    it('returns "done" when check_out is present', () => {
        const attendance: TodayAttendanceData = {
            id: '1',
            check_in: '2026-03-31T09:00:00+00:00',
            lunch_start: '2026-03-31T13:00:00+00:00',
            lunch_end: '2026-03-31T14:00:00+00:00',
            check_out: '2026-03-31T18:00:00+00:00',
            day_status: 'WORKED',
            entry_late_seconds: null,
            entry_late_minutes: null,
            is_entry_deductible: false,
            overtime_minutes: 0,
            overtime_authorized: false,
            overtime_authorized_at: null,
            overtime_valuation_method: null,
            overtime_rate_applied: null,
            overtime_amount: null,
            requires_overtime_decision: false,
        }
        expect(getAttendancePhase(attendance)).toBe('done')
    })

    it('returns "checked-in" when only check_in is present (no lunch)', () => {
        const attendance: TodayAttendanceData = {
            id: '1',
            check_in: '2026-03-31T09:00:00+00:00',
            lunch_start: null,
            lunch_end: null,
            check_out: null,
            day_status: 'WORKED',
            entry_late_seconds: null,
            entry_late_minutes: null,
            is_entry_deductible: false,
            overtime_minutes: 0,
            overtime_authorized: false,
            overtime_authorized_at: null,
            overtime_valuation_method: null,
            overtime_rate_applied: null,
            overtime_amount: null,
            requires_overtime_decision: false,
        }
        expect(getAttendancePhase(attendance)).toBe('checked-in')
    })

    it('returns "at-lunch" when lunch_start is present but no lunch_end', () => {
        const attendance: TodayAttendanceData = {
            id: '1',
            check_in: '2026-03-31T09:00:00+00:00',
            lunch_start: '2026-03-31T13:00:00+00:00',
            lunch_end: null,
            check_out: null,
            day_status: 'WORKED',
            entry_late_seconds: null,
            entry_late_minutes: null,
            is_entry_deductible: false,
            overtime_minutes: 0,
            overtime_authorized: false,
            overtime_authorized_at: null,
            overtime_valuation_method: null,
            overtime_rate_applied: null,
            overtime_amount: null,
            requires_overtime_decision: false,
        }
        expect(getAttendancePhase(attendance)).toBe('at-lunch')
    })

    it('returns "returned" when lunch_end is present but no check_out', () => {
        const attendance: TodayAttendanceData = {
            id: '1',
            check_in: '2026-03-31T09:00:00+00:00',
            lunch_start: '2026-03-31T13:00:00+00:00',
            lunch_end: '2026-03-31T14:00:00+00:00',
            check_out: null,
            day_status: 'WORKED',
            entry_late_seconds: null,
            entry_late_minutes: null,
            is_entry_deductible: false,
            overtime_minutes: 0,
            overtime_authorized: false,
            overtime_authorized_at: null,
            overtime_valuation_method: null,
            overtime_rate_applied: null,
            overtime_amount: null,
            requires_overtime_decision: false,
        }
        expect(getAttendancePhase(attendance)).toBe('returned')
    })

    it('returns "day-off" when day_status is DAY_OFF', () => {
        const attendance: TodayAttendanceData = {
            id: '1',
            check_in: null,
            lunch_start: null,
            lunch_end: null,
            check_out: null,
            day_status: 'DAY_OFF',
            entry_late_seconds: null,
            entry_late_minutes: null,
            is_entry_deductible: false,
            overtime_minutes: 0,
            overtime_authorized: false,
            overtime_authorized_at: null,
            overtime_valuation_method: null,
            overtime_rate_applied: null,
            overtime_amount: null,
            requires_overtime_decision: false,
        }
        expect(getAttendancePhase(attendance)).toBe('day-off')
    })

    it('returns "absence" when day_status is ABSENCE', () => {
        const attendance: TodayAttendanceData = {
            id: '1',
            check_in: null,
            lunch_start: null,
            lunch_end: null,
            check_out: null,
            day_status: 'ABSENCE',
            entry_late_seconds: null,
            entry_late_minutes: null,
            is_entry_deductible: false,
            overtime_minutes: 0,
            overtime_authorized: false,
            overtime_authorized_at: null,
            overtime_valuation_method: null,
            overtime_rate_applied: null,
            overtime_amount: null,
            requires_overtime_decision: false,
        }
        expect(getAttendancePhase(attendance)).toBe('absence')
    })

    it('returns "on-leave" when day_status is VACATION', () => {
        const attendance: TodayAttendanceData = {
            id: '1',
            check_in: null,
            lunch_start: null,
            lunch_end: null,
            check_out: null,
            day_status: 'VACATION',
            entry_late_seconds: null,
            entry_late_minutes: null,
            is_entry_deductible: false,
            overtime_minutes: 0,
            overtime_authorized: false,
            overtime_authorized_at: null,
            overtime_valuation_method: null,
            overtime_rate_applied: null,
            overtime_amount: null,
            requires_overtime_decision: false,
        }
        expect(getAttendancePhase(attendance)).toBe('on-leave')
    })
})

describe('isAbsentRow', () => {
    function makeRow(overrides: Partial<TodayAttendanceRow> = {}): TodayAttendanceRow {
        return {
            employee: {
                id: 'emp-1',
                code: 'EMP-001',
                user: { first_name: 'Test', last_name: 'User' },
                roles: [],
                daily_wage: null,
            },
            attendance: null,
            schedule: null,
            today_leave: null,
            ...overrides,
        }
    }

    function makeAttendance(overrides: Partial<TodayAttendanceData> = {}): TodayAttendanceData {
        return {
            id: 'att-1',
            check_in: null,
            lunch_start: null,
            lunch_end: null,
            check_out: null,
            day_status: 'WORKED',
            entry_late_seconds: null,
            entry_late_minutes: null,
            is_entry_deductible: false,
            overtime_minutes: 0,
            overtime_authorized: false,
            overtime_authorized_at: null,
            overtime_valuation_method: null,
            overtime_rate_applied: null,
            overtime_amount: null,
            requires_overtime_decision: false,
            ...overrides,
        }
    }

    it('returns true when day_status is ABSENCE', () => {
        const row = makeRow({ attendance: makeAttendance({ day_status: 'ABSENCE' }) })
        expect(isAbsentRow(row)).toBe(true)
    })

    it('returns true when day_status is VACATION', () => {
        const row = makeRow({ attendance: makeAttendance({ day_status: 'VACATION' }) })
        expect(isAbsentRow(row)).toBe(true)
    })

    it('returns true when day_status is LEAVE', () => {
        const row = makeRow({ attendance: makeAttendance({ day_status: 'LEAVE' }) })
        expect(isAbsentRow(row)).toBe(true)
    })

    it('returns true when today_leave is a full-day OPEN_ENDED leave, even without an attendance record yet', () => {
        const row = makeRow({
            attendance: null,
            today_leave: {
                id: 'leave-1',
                time_mode: 'OPEN_ENDED',
                calculation_mode: 'FIXED_PERCENTAGE',
                is_paid: true,
                starts_at: null,
                ends_at: null,
                note: null,
            },
        })
        expect(isAbsentRow(row)).toBe(true)
    })

    it('returns false when today_leave is a partial SCHEDULED leave — employee still works part of the day', () => {
        const row = makeRow({
            attendance: null,
            today_leave: {
                id: 'leave-1',
                time_mode: 'SCHEDULED',
                calculation_mode: 'PROPORTIONAL_HOURS',
                is_paid: true,
                starts_at: '2026-04-09T19:00:00+00:00',
                ends_at: '2026-04-09T22:00:00+00:00',
                note: null,
            },
        })
        expect(isAbsentRow(row)).toBe(false)
    })

    it('returns false for a pending row with no attendance and no leave', () => {
        expect(isAbsentRow(makeRow())).toBe(false)
    })

    it('returns true when day_status is DAY_OFF — a scheduled rest day counts as absent', () => {
        const row = makeRow({ attendance: makeAttendance({ day_status: 'DAY_OFF' }) })
        expect(isAbsentRow(row)).toBe(true)
    })

    it('returns false for a checked-in employee with no leave', () => {
        const row = makeRow({ attendance: makeAttendance({ check_in: '2026-04-09T13:00:00+00:00' }) })
        expect(isAbsentRow(row)).toBe(false)
    })
})

describe('isHiddenFromGrid', () => {
    function makeRow(overrides: Partial<TodayAttendanceRow> = {}): TodayAttendanceRow {
        return {
            employee: {
                id: 'emp-1',
                code: 'EMP-001',
                user: { first_name: 'Test', last_name: 'User' },
                roles: [],
                daily_wage: null,
            },
            attendance: null,
            schedule: null,
            today_leave: null,
            ...overrides,
        }
    }

    function makeAttendance(overrides: Partial<TodayAttendanceData> = {}): TodayAttendanceData {
        return {
            id: 'att-1',
            check_in: null,
            lunch_start: null,
            lunch_end: null,
            check_out: null,
            day_status: 'WORKED',
            entry_late_seconds: null,
            entry_late_minutes: null,
            is_entry_deductible: false,
            overtime_minutes: 0,
            overtime_authorized: false,
            overtime_authorized_at: null,
            overtime_valuation_method: null,
            overtime_rate_applied: null,
            overtime_amount: null,
            requires_overtime_decision: false,
            ...overrides,
        }
    }

    it('returns true when day_status is VACATION', () => {
        const row = makeRow({ attendance: makeAttendance({ day_status: 'VACATION' }) })
        expect(isHiddenFromGrid(row)).toBe(true)
    })

    it('returns false when day_status is LEAVE — stays in grid so the informational leave chip/badge remains reachable', () => {
        const row = makeRow({ attendance: makeAttendance({ day_status: 'LEAVE' }) })
        expect(isHiddenFromGrid(row)).toBe(false)
    })

    it('returns false for a full-day OPEN_ENDED today_leave — the card must stay visible to show the leave chip', () => {
        const row = makeRow({
            today_leave: {
                id: 'leave-1',
                time_mode: 'OPEN_ENDED',
                calculation_mode: 'FIXED_PERCENTAGE',
                is_paid: true,
                starts_at: null,
                ends_at: null,
                note: null,
            },
        })
        expect(isHiddenFromGrid(row)).toBe(false)
    })

    it('returns false when day_status is ABSENCE — stays in grid so "Justificar falta" remains reachable', () => {
        const row = makeRow({ attendance: makeAttendance({ day_status: 'ABSENCE' }) })
        expect(isHiddenFromGrid(row)).toBe(false)
    })

    it('returns false for a partial SCHEDULED today_leave', () => {
        const row = makeRow({
            today_leave: {
                id: 'leave-1',
                time_mode: 'SCHEDULED',
                calculation_mode: 'PROPORTIONAL_HOURS',
                is_paid: true,
                starts_at: '2026-04-09T19:00:00+00:00',
                ends_at: '2026-04-09T22:00:00+00:00',
                note: null,
            },
        })
        expect(isHiddenFromGrid(row)).toBe(false)
    })

    it('returns false for a pending row with no attendance and no leave', () => {
        expect(isHiddenFromGrid(makeRow())).toBe(false)
    })

    it('returns true when day_status is DAY_OFF — a scheduled rest day never needs action', () => {
        const row = makeRow({ attendance: makeAttendance({ day_status: 'DAY_OFF' }) })
        expect(isHiddenFromGrid(row)).toBe(true)
    })
})

describe('formatSeconds', () => {
    it('returns "0m" for null input', () => {
        expect(formatSeconds(null)).toBe('0m')
    })

    it('returns "0m" for zero seconds', () => {
        expect(formatSeconds(0)).toBe('0m')
    })

    it('returns "0m" for negative seconds', () => {
        expect(formatSeconds(-60)).toBe('0m')
    })

    it('formats seconds under 60 minutes as "Xm"', () => {
        expect(formatSeconds(60)).toBe('1m')
        expect(formatSeconds(120)).toBe('2m')
        expect(formatSeconds(300)).toBe('5m')
        expect(formatSeconds(3540)).toBe('59m') // 59 minutes
    })

    it('formats 60+ minutes as "Xh Ym"', () => {
        expect(formatSeconds(3600)).toBe('1h') // exactly 1 hour
        expect(formatSeconds(3660)).toBe('1h 1m') // 1 hour 1 minute
        expect(formatSeconds(5400)).toBe('1h 30m') // 1.5 hours
        expect(formatSeconds(7200)).toBe('2h') // exactly 2 hours
        expect(formatSeconds(7260)).toBe('2h 1m') // 2 hours 1 minute
    })

    it('handles large values correctly', () => {
        expect(formatSeconds(36000)).toBe('10h') // 10 hours
        expect(formatSeconds(36060)).toBe('10h 1m') // 10 hours 1 minute
    })
})

describe('formatTime', () => {
    // formatTime converts UTC ISO strings to CDMX (UTC-6) "HH:mm" display.
    // Uses pure math (no Date methods) — deterministic regardless of host timezone.

    it('returns "—" for null input', () => {
        expect(formatTime(null)).toBe('—')
    })

    it('returns "—" for invalid date string', () => {
        expect(formatTime('invalid')).toBe('—')
        expect(formatTime('not-a-date')).toBe('—')
        expect(formatTime('')).toBe('—')
    })

    it('converts UTC +00:00 to CDMX (UTC-6)', () => {
        // 15:30 UTC → 09:30 CDMX
        expect(formatTime('2026-03-31T15:30:00+00:00')).toBe('09:30')
    })

    it('converts UTC "Z" suffix to CDMX', () => {
        // 20:00 UTC → 14:00 CDMX
        expect(formatTime('2026-04-02T20:00:00Z')).toBe('14:00')
    })

    it('converts positive offset to CDMX via UTC', () => {
        // 08:00+09:00 = 23:00 UTC previous day → 17:00 CDMX
        expect(formatTime('2026-04-02T08:00:00+09:00')).toBe('17:00')
    })

    it('converts negative offset to CDMX via UTC', () => {
        // 14:30-06:00 = 20:30 UTC → 14:30 CDMX
        expect(formatTime('2026-04-02T14:30:00-06:00')).toBe('14:30')
    })

    it('handles midnight UTC → 18:00 CDMX previous day', () => {
        // 00:00 UTC → 18:00 CDMX (previous day in absolute terms)
        expect(formatTime('2026-03-31T00:00:00+00:00')).toBe('18:00')
    })

    it('handles day boundary wraparound (early UTC hours)', () => {
        // 05:00 UTC → 23:00 CDMX (previous day)
        expect(formatTime('2026-03-31T05:00:00+00:00')).toBe('23:00')
    })

    it('pads single-digit hours and minutes', () => {
        // 06:05 UTC → 00:05 CDMX
        expect(formatTime('2026-03-31T06:05:00+00:00')).toBe('00:05')
    })

    it('handles leap year date correctly', () => {
        // 2028-02-29 is a leap year day: 19:00 UTC → 13:00 CDMX
        expect(formatTime('2028-02-29T19:00:00+00:00')).toBe('13:00')
    })
})
