import { describe, it, expect } from 'vitest'
import type { EmploymentPeriod } from '../employment-period'

describe('Employment Period Types', () => {
    it('can create an active employment period', () => {
        const period: EmploymentPeriod = {
            id: '01HX9Y2Z3A4B5C6D7E8F9G0H1J',
            branch_id: 1,
            branch_name: 'Sucursal Centro',
            start_date: '2026-01-01',
            end_date: null,
            termination_reason: null,
            is_active: true,
        }
        expect(period.is_active).toBe(true)
        expect(period.end_date).toBeNull()
        expect(period.termination_reason).toBeNull()
    })

    it('can create a terminated employment period', () => {
        const period: EmploymentPeriod = {
            id: '01HX9Y2Z3A4B5C6D7E8F9G0H1J',
            branch_id: 1,
            branch_name: 'Sucursal Centro',
            start_date: '2025-01-01',
            end_date: '2025-12-31',
            termination_reason: 'Renuncia voluntaria',
            is_active: false,
        }
        expect(period.is_active).toBe(false)
        expect(period.end_date).toBe('2025-12-31')
        expect(period.termination_reason).toBe('Renuncia voluntaria')
    })

    it('uses ULID as id format', () => {
        const period: EmploymentPeriod = {
            id: '01HX9Y2Z3A4B5C6D7E8F9G0H1J',
            branch_id: 1,
            branch_name: 'Test Branch',
            start_date: '2026-01-01',
            end_date: null,
            termination_reason: null,
            is_active: true,
        }
        // ULID is 26 characters
        expect(period.id).toHaveLength(26)
    })

    it('stores branch_id and branch_name separately', () => {
        const period: EmploymentPeriod = {
            id: '01HX9Y2Z3A4B5C6D7E8F9G0H1J',
            branch_id: 42,
            branch_name: 'Sucursal Norte',
            start_date: '2026-01-01',
            end_date: null,
            termination_reason: null,
            is_active: true,
        }
        expect(period.branch_id).toBe(42)
        expect(period.branch_name).toBe('Sucursal Norte')
    })
})
