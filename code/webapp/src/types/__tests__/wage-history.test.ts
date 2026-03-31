import { describe, it, expect } from 'vitest'
import type { WageHistory, CreateWageData } from '../wage-history'

describe('Wage History Types', () => {
    describe('WageHistory interface', () => {
        it('can create a current wage history entry', () => {
            const wage: WageHistory = {
                id: '01HX9Y2Z3A4B5C6D7E8F9G0H1J',
                hourly_rate: '125.50',
                weekly_scheduled_hours: 48,
                effective_from: '2026-01-01',
                effective_to: null,
                notes: null,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
            }
            expect(wage.effective_to).toBeNull()
            expect(wage.weekly_scheduled_hours).toBe(48)
        })

        it('stores hourly_rate as string for decimal precision', () => {
            const wage: WageHistory = {
                id: '01HX9Y2Z3A4B5C6D7E8F9G0H1J',
                hourly_rate: '99.99',
                weekly_scheduled_hours: 40,
                effective_from: '2026-01-01',
                effective_to: null,
                notes: null,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
            }
            // API returns decimal as string to preserve precision
            expect(typeof wage.hourly_rate).toBe('string')
            expect(parseFloat(wage.hourly_rate)).toBeCloseTo(99.99)
        })

        it('can create a historical wage entry with end date', () => {
            const wage: WageHistory = {
                id: '01HX9Y2Z3A4B5C6D7E8F9G0H1J',
                hourly_rate: '100.00',
                weekly_scheduled_hours: 40,
                effective_from: '2025-01-01',
                effective_to: '2025-12-31',
                notes: 'Salario inicial',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-12-31T00:00:00Z',
            }
            expect(wage.effective_to).toBe('2025-12-31')
            expect(wage.notes).toBe('Salario inicial')
        })
    })

    describe('CreateWageData interface', () => {
        it('can create data for new wage entry', () => {
            const data: CreateWageData = {
                hourly_rate: 150.00,
                weekly_scheduled_hours: 48,
                effective_from: '2026-04-01',
            }
            expect(data.hourly_rate).toBe(150.00)
            expect(data.notes).toBeUndefined()
        })

        it('can include optional notes', () => {
            const data: CreateWageData = {
                hourly_rate: 150.00,
                weekly_scheduled_hours: 48,
                effective_from: '2026-04-01',
                notes: 'Aumento por antigüedad',
            }
            expect(data.notes).toBe('Aumento por antigüedad')
        })

        it('accepts null for notes', () => {
            const data: CreateWageData = {
                hourly_rate: 150.00,
                weekly_scheduled_hours: 48,
                effective_from: '2026-04-01',
                notes: null,
            }
            expect(data.notes).toBeNull()
        })

        it('uses number for hourly_rate in create payload', () => {
            const data: CreateWageData = {
                hourly_rate: 125.50,
                weekly_scheduled_hours: 40,
                effective_from: '2026-01-01',
            }
            // Create payload uses number, API returns string
            expect(typeof data.hourly_rate).toBe('number')
        })
    })
})
