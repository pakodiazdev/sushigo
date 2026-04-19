import { describe, it, expect, vi, beforeEach } from 'vitest'
import { employeeApi } from '../employee-api'

// ── Mock ───────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api-client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
    },
}))

import { apiClient } from '@/lib/api-client'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('employeeApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ── list ───────────────────────────────────────────────────────────────────

    describe('list', () => {
        it('calls GET /employees without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await employeeApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/employees', { params: undefined })
            expect(result).toEqual(mockResponse)
        })

        it('calls GET /employees with filters', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const filters = { search: 'John', status: 'active' as const }
            const result = await employeeApi.list(filters)

            expect(apiClient.get).toHaveBeenCalledWith('/employees', { params: filters })
            expect(result).toEqual(mockResponse)
        })
    })

    // ── get ────────────────────────────────────────────────────────────────────

    describe('get', () => {
        it('calls GET /employees/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: '01HTEST001' } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await employeeApi.get('01HTEST001')

            expect(apiClient.get).toHaveBeenCalledWith('/employees/01HTEST001')
            expect(result).toEqual(mockResponse)
        })
    })

    // ── create ─────────────────────────────────────────────────────────────────

    describe('create', () => {
        it('calls POST /employees with form data', async () => {
            const mockResponse = { data: { status: 201, data: { id: '01HTEST002' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const formData = {
                code: 'EMP001',
                first_name: 'Juan',
                last_name: 'Pérez',
                roles: ['cook' as const],
                phone: '5551234567',
                email: 'juan@example.com',
                branch_id: 1,
                start_date: '2026-01-01',
            }

            const result = await employeeApi.create(formData)

            expect(apiClient.post).toHaveBeenCalledWith('/employees', formData)
            expect(result).toEqual(mockResponse)
        })
    })

    // ── update ─────────────────────────────────────────────────────────────────

    describe('update', () => {
        it('calls PUT /employees/:id with update data', async () => {
            const mockResponse = { data: { status: 200, data: { id: '01HTEST001' } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const updateData = {
                first_name: 'Juan Carlos',
                phone: '5559876543',
            }

            const result = await employeeApi.update('01HTEST001', updateData)

            expect(apiClient.put).toHaveBeenCalledWith('/employees/01HTEST001', updateData)
            expect(result).toEqual(mockResponse)
        })
    })

    // ── toggleActive ───────────────────────────────────────────────────────────

    describe('toggleActive', () => {
        it('calls PATCH /employees/:id/toggle-active', async () => {
            const mockResponse = { data: { status: 200, data: { id: '01HTEST001', is_active: false } } }
            vi.mocked(apiClient.patch).mockResolvedValue(mockResponse)

            const result = await employeeApi.toggleActive('01HTEST001')

            expect(apiClient.patch).toHaveBeenCalledWith('/employees/01HTEST001/toggle-active')
            expect(result).toEqual(mockResponse)
        })
    })

    // ── deactivate ─────────────────────────────────────────────────────────────

    describe('deactivate', () => {
        it('calls PATCH /employees/:id/deactivate with reason data', async () => {
            const mockResponse = { data: { status: 200, data: { id: '01HTEST001' } } }
            vi.mocked(apiClient.patch).mockResolvedValue(mockResponse)

            const deactivateData = {
                reason: 'voluntary_resignation',
                end_date: '2026-04-15',
                notes: 'Renuncia voluntaria',
            }

            const result = await employeeApi.deactivate('01HTEST001', deactivateData)

            expect(apiClient.patch).toHaveBeenCalledWith(
                '/employees/01HTEST001/deactivate',
                deactivateData
            )
            expect(result).toEqual(mockResponse)
        })
    })

    // ── rehire ─────────────────────────────────────────────────────────────────

    describe('rehire', () => {
        it('calls PATCH /employees/:id/rehire with rehire data', async () => {
            const mockResponse = { data: { status: 200, data: { id: '01HTEST001' } } }
            vi.mocked(apiClient.patch).mockResolvedValue(mockResponse)

            const rehireData = {
                branch_id: 1,
                start_date: '2026-05-01',
            }

            const result = await employeeApi.rehire('01HTEST001', rehireData)

            expect(apiClient.patch).toHaveBeenCalledWith('/employees/01HTEST001/rehire', rehireData)
            expect(result).toEqual(mockResponse)
        })
    })

    // ── nextCode ───────────────────────────────────────────────────────────────

    describe('nextCode', () => {
        it('calls GET /employees/next-code', async () => {
            const mockResponse = { data: { code: 'EMP042', prefix: 'EMP' } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await employeeApi.nextCode()

            expect(apiClient.get).toHaveBeenCalledWith('/employees/next-code')
            expect(result).toEqual(mockResponse)
        })
    })

    // ── assignableRoles ────────────────────────────────────────────────────────

    describe('assignableRoles', () => {
        it('calls GET /employees/assignable-roles', async () => {
            const mockResponse = { data: { status: 200, data: ['cashier', 'inventory-manager'] } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await employeeApi.assignableRoles()

            expect(apiClient.get).toHaveBeenCalledWith('/employees/assignable-roles')
            expect(result).toEqual(mockResponse)
        })
    })

    // ── listWages ──────────────────────────────────────────────────────────────

    describe('listWages', () => {
        it('calls GET /employees/:id/wages', async () => {
            const mockResponse = { data: { status: 200, data: [] } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await employeeApi.listWages('01HTEST001')

            expect(apiClient.get).toHaveBeenCalledWith('/employees/01HTEST001/wages')
            expect(result).toEqual(mockResponse)
        })
    })

    // ── createWage ─────────────────────────────────────────────────────────────

    describe('createWage', () => {
        it('calls POST /employees/:id/wages with wage data', async () => {
            const mockResponse = { data: { status: 201, data: { id: 1 } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const wageData = {
                effective_from: '2026-05-01',
                hourly_rate: 70,
                weekly_scheduled_hours: 48,
                notes: 'Aumento semestral',
            }

            const result = await employeeApi.createWage('01HTEST001', wageData)

            expect(apiClient.post).toHaveBeenCalledWith('/employees/01HTEST001/wages', wageData)
            expect(result).toEqual(mockResponse)
        })
    })
})
