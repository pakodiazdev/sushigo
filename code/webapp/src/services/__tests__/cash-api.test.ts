import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    cashRegisterApi,
    cashTerminalApi,
    bankAccountApi,
    cashSessionApi,
    cashAdjustmentApi,
    cashExpenseApi,
} from '../cash-api'
import type {
    CashRegisterFormData,
    CashTerminalFormData,
    BankAccountFormData,
    CashSessionFormData,
    CashAdjustmentFormData,
    CashExpenseFormData,
    CashSessionFilters,
    SessionStatus,
    AdjustmentType,
    Direction,
    TenderType,
} from '@/types/cash'

// ── Mock ───────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api-client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}))

import { apiClient } from '@/lib/api-client'

// ── Tests: cashRegisterApi ─────────────────────────────────────────────────────

describe('cashRegisterApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /cash-registers without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await cashRegisterApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/cash-registers', { params: undefined })
            expect(result).toEqual(mockResponse)
        })

        it('calls GET /cash-registers with filters', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const params = { is_active: true, search: 'caja' }
            const result = await cashRegisterApi.list(params)

            expect(apiClient.get).toHaveBeenCalledWith('/cash-registers', { params })
            expect(result).toEqual(mockResponse)
        })
    })

    describe('nextCode', () => {
        it('calls GET /cash-registers/next-code', async () => {
            const mockResponse = { data: { code: 'REG-004', prefix: 'REG-' } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await cashRegisterApi.nextCode()

            expect(apiClient.get).toHaveBeenCalledWith('/cash-registers/next-code')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('get', () => {
        it('calls GET /cash-registers/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: '1' } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await cashRegisterApi.get('1')

            expect(apiClient.get).toHaveBeenCalledWith('/cash-registers/1')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('create', () => {
        it('calls POST /cash-registers', async () => {
            const mockResponse = { data: { status: 201, data: { id: '1' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data = { name: 'Caja 1', code: 'CAJA01' } as CashRegisterFormData
            const result = await cashRegisterApi.create(data)

            expect(apiClient.post).toHaveBeenCalledWith('/cash-registers', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('update', () => {
        it('calls PUT /cash-registers/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: '1' } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const data = { name: 'Caja Principal' }
            const result = await cashRegisterApi.update('1', data)

            expect(apiClient.put).toHaveBeenCalledWith('/cash-registers/1', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('delete', () => {
        it('calls DELETE /cash-registers/:id', async () => {
            const mockResponse = { data: { status: 200, message: 'Deleted' } }
            vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

            const result = await cashRegisterApi.delete('1')

            expect(apiClient.delete).toHaveBeenCalledWith('/cash-registers/1')
            expect(result).toEqual(mockResponse)
        })
    })
})

// ── Tests: cashTerminalApi ─────────────────────────────────────────────────────

describe('cashTerminalApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /cash-terminals without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await cashTerminalApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/cash-terminals', { params: undefined })
            expect(result).toEqual(mockResponse)
        })
    })

    describe('get', () => {
        it('calls GET /cash-terminals/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: '1' } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await cashTerminalApi.get('1')

            expect(apiClient.get).toHaveBeenCalledWith('/cash-terminals/1')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('create', () => {
        it('calls POST /cash-terminals', async () => {
            const mockResponse = { data: { status: 201, data: { id: '1' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data: CashTerminalFormData = {
                branch_id: 1,
                name: 'Terminal 1',
                provider: 'BBVA',
                account_ref: 'REF123',
                last_four: '1234',
                is_active: true,
            }
            const result = await cashTerminalApi.create(data)

            expect(apiClient.post).toHaveBeenCalledWith('/cash-terminals', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('update', () => {
        it('calls PUT /cash-terminals/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: '1' } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const data = { name: 'Terminal Actualizada' }
            const result = await cashTerminalApi.update('1', data)

            expect(apiClient.put).toHaveBeenCalledWith('/cash-terminals/1', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('delete', () => {
        it('calls DELETE /cash-terminals/:id', async () => {
            const mockResponse = { data: { status: 200, message: 'Deleted' } }
            vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

            const result = await cashTerminalApi.delete('1')

            expect(apiClient.delete).toHaveBeenCalledWith('/cash-terminals/1')
            expect(result).toEqual(mockResponse)
        })
    })
})

// ── Tests: bankAccountApi ──────────────────────────────────────────────────────

describe('bankAccountApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /bank-accounts without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await bankAccountApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/bank-accounts', { params: undefined })
            expect(result).toEqual(mockResponse)
        })
    })

    describe('get', () => {
        it('calls GET /bank-accounts/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: '1' } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await bankAccountApi.get('1')

            expect(apiClient.get).toHaveBeenCalledWith('/bank-accounts/1')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('create', () => {
        it('calls POST /bank-accounts', async () => {
            const mockResponse = { data: { status: 201, data: { id: '1' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data: BankAccountFormData = {
                branch_id: 1,
                alias: 'Cuenta Principal',
                bank_name: 'BBVA',
                account_number_masked: '****7890',
                clabe_masked: '****4567',
                is_active: true,
            }
            const result = await bankAccountApi.create(data)

            expect(apiClient.post).toHaveBeenCalledWith('/bank-accounts', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('update', () => {
        it('calls PUT /bank-accounts/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: '1' } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const data = { bank_name: 'Santander' }
            const result = await bankAccountApi.update('1', data)

            expect(apiClient.put).toHaveBeenCalledWith('/bank-accounts/1', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('delete', () => {
        it('calls DELETE /bank-accounts/:id', async () => {
            const mockResponse = { data: { status: 200, message: 'Deleted' } }
            vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

            const result = await bankAccountApi.delete('1')

            expect(apiClient.delete).toHaveBeenCalledWith('/bank-accounts/1')
            expect(result).toEqual(mockResponse)
        })
    })
})

// ── Tests: cashSessionApi ──────────────────────────────────────────────────────

describe('cashSessionApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /cash-sessions without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await cashSessionApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/cash-sessions', { params: undefined })
            expect(result).toEqual(mockResponse)
        })

        it('calls GET /cash-sessions with status filter', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const params: CashSessionFilters = { status: 'DRAFT' as SessionStatus }
            const result = await cashSessionApi.list(params)

            expect(apiClient.get).toHaveBeenCalledWith('/cash-sessions', { params })
            expect(result).toEqual(mockResponse)
        })
    })

    describe('get', () => {
        it('calls GET /cash-sessions/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: '1' } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await cashSessionApi.get('1')

            expect(apiClient.get).toHaveBeenCalledWith('/cash-sessions/1')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('create', () => {
        it('calls POST /cash-sessions', async () => {
            const mockResponse = { data: { status: 201, data: { id: '1' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data = { cash_register_id: '1', operating_date: '2026-04-18' } as CashSessionFormData
            const result = await cashSessionApi.create(data)

            expect(apiClient.post).toHaveBeenCalledWith('/cash-sessions', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('update', () => {
        it('calls PUT /cash-sessions/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: '1' } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const data: Partial<CashSessionFormData> = { operating_date: '2026-04-19' }
            const result = await cashSessionApi.update('1', data)

            expect(apiClient.put).toHaveBeenCalledWith('/cash-sessions/1', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('post', () => {
        it('calls POST /cash-sessions/:id/post', async () => {
            const mockResponse = { data: { status: 200, data: { id: '1', status: 'POSTED' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const result = await cashSessionApi.post('1')

            expect(apiClient.post).toHaveBeenCalledWith('/cash-sessions/1/post')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('getSummary', () => {
        it('calls GET /cash-sessions/:id/summary', async () => {
            const mockResponse = {
                data: {
                    status: 200,
                    data: { opening_cash: 1000, total_sales: 5000 },
                },
            }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await cashSessionApi.getSummary('1')

            expect(apiClient.get).toHaveBeenCalledWith('/cash-sessions/1/summary')
            expect(result).toEqual(mockResponse)
        })
    })
})

// ── Tests: cashAdjustmentApi ───────────────────────────────────────────────────

describe('cashAdjustmentApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /cash-adjustments without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await cashAdjustmentApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/cash-adjustments', { params: undefined })
            expect(result).toEqual(mockResponse)
        })
    })

    describe('get', () => {
        it('calls GET /cash-adjustments/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: '1' } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await cashAdjustmentApi.get('1')

            expect(apiClient.get).toHaveBeenCalledWith('/cash-adjustments/1')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('create', () => {
        it('calls POST /cash-adjustments', async () => {
            const mockResponse = { data: { status: 201, data: { id: '1' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data: CashAdjustmentFormData = {
                cash_session_id: '1',
                type: 'CORRECTION' as AdjustmentType,
                direction: 'INFLOW' as Direction,
                notes: 'Corrección de caja',
                lines: [{ tender_type: 'CASH' as TenderType, amount: '100.00' }],
            }
            const result = await cashAdjustmentApi.create(data)

            expect(apiClient.post).toHaveBeenCalledWith('/cash-adjustments', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('post', () => {
        it('calls POST /cash-adjustments/:id/post', async () => {
            const mockResponse = { data: { status: 200, data: { id: '1', status: 'POSTED' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const result = await cashAdjustmentApi.post('1')

            expect(apiClient.post).toHaveBeenCalledWith('/cash-adjustments/1/post')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('delete', () => {
        it('calls DELETE /cash-adjustments/:id', async () => {
            const mockResponse = { data: { status: 200, message: 'Deleted' } }
            vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

            const result = await cashAdjustmentApi.delete('1')

            expect(apiClient.delete).toHaveBeenCalledWith('/cash-adjustments/1')
            expect(result).toEqual(mockResponse)
        })
    })
})

// ── Tests: cashExpenseApi ──────────────────────────────────────────────────────

describe('cashExpenseApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /cash-expenses without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await cashExpenseApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/cash-expenses', { params: undefined })
            expect(result).toEqual(mockResponse)
        })
    })

    describe('get', () => {
        it('calls GET /cash-expenses/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: '1' } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await cashExpenseApi.get('1')

            expect(apiClient.get).toHaveBeenCalledWith('/cash-expenses/1')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('create', () => {
        it('calls POST /cash-expenses', async () => {
            const mockResponse = { data: { status: 201, data: { id: '1' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data: CashExpenseFormData = {
                cash_session_id: '1',
                tender_type: 'CASH' as TenderType,
                amount: '250.00',
                category: 'SUPPLIES',
                vendor: 'Proveedor XYZ',
                incurred_at: '2026-04-18T10:00:00Z',
            }
            const result = await cashExpenseApi.create(data)

            expect(apiClient.post).toHaveBeenCalledWith('/cash-expenses', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('update', () => {
        it('calls PUT /cash-expenses/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: '1' } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const data: Partial<CashExpenseFormData> = { category: 'CLEANING' }
            const result = await cashExpenseApi.update('1', data)

            expect(apiClient.put).toHaveBeenCalledWith('/cash-expenses/1', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('post', () => {
        it('calls POST /cash-expenses/:id/post', async () => {
            const mockResponse = { data: { status: 200, data: { id: '1', status: 'POSTED' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const result = await cashExpenseApi.post('1')

            expect(apiClient.post).toHaveBeenCalledWith('/cash-expenses/1/post')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('delete', () => {
        it('calls DELETE /cash-expenses/:id', async () => {
            const mockResponse = { data: { status: 200, message: 'Deleted' } }
            vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

            const result = await cashExpenseApi.delete('1')

            expect(apiClient.delete).toHaveBeenCalledWith('/cash-expenses/1')
            expect(result).toEqual(mockResponse)
        })
    })
})
