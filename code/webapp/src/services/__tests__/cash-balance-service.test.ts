import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    calculateCurrentBalance,
    calculateExpectedClosingBalance,
    calculateVariance,
    formatCurrency,
    hasSignificantVariance,
    getVarianceType,
} from '@/services/cash-balance-service'
import { SessionStatus } from '@/types/cash'
import type { CashSession, SessionSummary } from '@/types/cash'

// Silence console.log during tests
beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => { })
})

afterEach(() => {
    vi.restoreAllMocks()
})

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

function createSession(overrides: Partial<CashSession> = {}): CashSession {
    return {
        id: 1,
        cash_register_id: 1,
        operating_date: '2026-03-31',
        opening_balance: '1000.00',
        closing_balance: null,
        status: SessionStatus.DRAFT,
        opened_by: 1,
        opened_at: '2026-03-31T08:00:00+00:00',
        posted_by: null,
        posted_at: null,
        meta: null,
        created_at: '2026-03-31T08:00:00+00:00',
        updated_at: '2026-03-31T08:00:00+00:00',
        ...overrides,
    }
}

function createSummary(session: CashSession, overrides: Partial<SessionSummary> = {}): SessionSummary {
    return {
        session,
        incomes: [],
        expenses: [],
        closing_balance: '0.00',
        total_incomes: '0.00',
        total_expenses: '0.00',
        current_balance: '',
        ...overrides,
    }
}

// ─── calculateCurrentBalance ───────────────────────────────────────────────────

describe('calculateCurrentBalance', () => {
    it('returns opening balance when no summary provided', () => {
        const session = createSession({ opening_balance: '500.00' })
        expect(calculateCurrentBalance(session)).toBe('500.00')
    })

    it('returns "0.00" when no summary and no opening balance', () => {
        const session = createSession({ opening_balance: undefined as unknown as string })
        expect(calculateCurrentBalance(session)).toBe('0.00')
    })

    it('uses backend current_balance when available in summary', () => {
        const session = createSession({ opening_balance: '1000.00' })
        const summary = createSummary(session, { current_balance: '1500.00' })

        expect(calculateCurrentBalance(session, summary)).toBe('1500.00')
    })

    it('calculates manually when summary has no current_balance', () => {
        const session = createSession({ opening_balance: '1000.00' })
        const summary = createSummary(session, {
            current_balance: '', // Empty string is falsy
            total_incomes: '500.00',
            total_expenses: '200.00',
        })

        // 1000 + 500 - 200 = 1300
        expect(calculateCurrentBalance(session, summary)).toBe('1300.00')
    })

    it('handles zero incomes and expenses', () => {
        const session = createSession({ opening_balance: '100.00' })
        const summary = createSummary(session, {
            current_balance: '',
            total_incomes: '0.00',
            total_expenses: '0.00',
        })

        expect(calculateCurrentBalance(session, summary)).toBe('100.00')
    })

    it('handles negative result (expenses > opening + incomes)', () => {
        const session = createSession({ opening_balance: '100.00' })
        const summary = createSummary(session, {
            current_balance: '',
            total_incomes: '50.00',
            total_expenses: '200.00',
        })

        // 100 + 50 - 200 = -50
        expect(calculateCurrentBalance(session, summary)).toBe('-50.00')
    })

    it('handles decimal precision correctly', () => {
        const session = createSession({ opening_balance: '100.55' })
        const summary = createSummary(session, {
            current_balance: '',
            total_incomes: '50.33',
            total_expenses: '25.11',
        })

        // 100.55 + 50.33 - 25.11 = 125.77
        expect(calculateCurrentBalance(session, summary)).toBe('125.77')
    })
})

// ─── calculateExpectedClosingBalance ───────────────────────────────────────────

describe('calculateExpectedClosingBalance', () => {
    it('returns closing_balance when available', () => {
        const session = createSession({
            opening_balance: '1000.00',
            closing_balance: '1500.00',
        })

        expect(calculateExpectedClosingBalance(session)).toBe('1500.00')
    })

    it('falls back to opening_balance when no closing_balance', () => {
        const session = createSession({
            opening_balance: '1000.00',
            closing_balance: null,
        })

        expect(calculateExpectedClosingBalance(session)).toBe('1000.00')
    })

    it('returns "0.00" when both closing and opening balance are missing', () => {
        const session = createSession({
            opening_balance: undefined as unknown as string,
            closing_balance: null,
        })

        expect(calculateExpectedClosingBalance(session)).toBe('0.00')
    })
})

// ─── calculateVariance ─────────────────────────────────────────────────────────

describe('calculateVariance', () => {
    it('returns positive when current > expected (surplus)', () => {
        expect(calculateVariance('1500.00', '1000.00')).toBe(500)
    })

    it('returns negative when current < expected (shortage)', () => {
        expect(calculateVariance('800.00', '1000.00')).toBe(-200)
    })

    it('returns zero when current equals expected', () => {
        expect(calculateVariance('1000.00', '1000.00')).toBe(0)
    })

    it('handles decimal precision', () => {
        expect(calculateVariance('100.55', '100.50')).toBeCloseTo(0.05, 2)
    })

    it('handles negative balances', () => {
        expect(calculateVariance('-50.00', '100.00')).toBe(-150)
    })
})

// ─── formatCurrency ────────────────────────────────────────────────────────────

describe('formatCurrency', () => {
    it('formats positive string amount', () => {
        const result = formatCurrency('1234.56')
        expect(result).toMatch(/\$1,234\.56/)
    })

    it('formats positive number amount', () => {
        const result = formatCurrency(1234.56)
        expect(result).toMatch(/\$1,234\.56/)
    })

    it('formats zero', () => {
        const result = formatCurrency('0.00')
        expect(result).toMatch(/\$0\.00/)
    })

    it('formats negative amount', () => {
        const result = formatCurrency('-500.00')
        expect(result).toMatch(/-?\$?500\.00/)
    })

    it('returns "$0.00" for NaN input', () => {
        expect(formatCurrency('invalid')).toBe('$0.00')
    })

    it('returns "$0.00" for empty string', () => {
        expect(formatCurrency('')).toBe('$0.00')
    })

    it('handles large numbers', () => {
        const result = formatCurrency('1000000.00')
        expect(result).toMatch(/\$1,000,000\.00/)
    })

    it('rounds to 2 decimal places', () => {
        const result = formatCurrency(100.555)
        // May round to .55 or .56 depending on locale/library
        expect(result).toMatch(/\$100\.5[56]/)
    })
})

// ─── hasSignificantVariance ────────────────────────────────────────────────────

describe('hasSignificantVariance', () => {
    it('returns false when variance is zero', () => {
        expect(hasSignificantVariance(0)).toBe(false)
    })

    it('returns false when variance is within default threshold', () => {
        expect(hasSignificantVariance(0.005)).toBe(false)
        expect(hasSignificantVariance(-0.005)).toBe(false)
    })

    it('returns false when variance equals default threshold', () => {
        expect(hasSignificantVariance(0.01)).toBe(false)
    })

    it('returns true when variance exceeds default threshold', () => {
        expect(hasSignificantVariance(0.02)).toBe(true)
        expect(hasSignificantVariance(-0.02)).toBe(true)
    })

    it('uses custom threshold when provided', () => {
        expect(hasSignificantVariance(0.5, 1.0)).toBe(false)
        expect(hasSignificantVariance(1.5, 1.0)).toBe(true)
    })

    it('handles large variances', () => {
        expect(hasSignificantVariance(1000)).toBe(true)
        expect(hasSignificantVariance(-1000)).toBe(true)
    })
})

// ─── getVarianceType ───────────────────────────────────────────────────────────

describe('getVarianceType', () => {
    it('returns "balanced" for zero variance', () => {
        expect(getVarianceType(0)).toBe('balanced')
    })

    it('returns "balanced" for variance within tolerance', () => {
        expect(getVarianceType(0.005)).toBe('balanced')
        expect(getVarianceType(-0.005)).toBe('balanced')
        expect(getVarianceType(0.01)).toBe('balanced')
        expect(getVarianceType(-0.01)).toBe('balanced')
    })

    it('returns "surplus" for positive variance above tolerance', () => {
        expect(getVarianceType(0.02)).toBe('surplus')
        expect(getVarianceType(100)).toBe('surplus')
    })

    it('returns "shortage" for negative variance below tolerance', () => {
        expect(getVarianceType(-0.02)).toBe('shortage')
        expect(getVarianceType(-100)).toBe('shortage')
    })

    it('handles edge cases near tolerance boundary', () => {
        expect(getVarianceType(0.011)).toBe('surplus')
        expect(getVarianceType(-0.011)).toBe('shortage')
    })
})
