// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// ── Mock dependencies ─────────────────────────────────────────────────────────

const mockEmployeeList = vi.fn()
const mockEmployeeGet = vi.fn()
const mockEmployeeMe = vi.fn()
const mockEmployeeNextCode = vi.fn()
const mockEmployeeAssignableRoles = vi.fn()
const mockEmployeeCreate = vi.fn()
const mockEmployeeUpdate = vi.fn()
const mockEmployeeToggleActive = vi.fn()
const mockEmployeeDeactivate = vi.fn()
const mockEmployeeRehire = vi.fn()
const mockEmployeeListWages = vi.fn()
const mockEmployeeCreateWage = vi.fn()

vi.mock('@/services/employee-api', () => ({
    employeeApi: {
        list: (...args: unknown[]) => mockEmployeeList(...args),
        get: (...args: unknown[]) => mockEmployeeGet(...args),
        me: () => mockEmployeeMe(),
        nextCode: () => mockEmployeeNextCode(),
        assignableRoles: () => mockEmployeeAssignableRoles(),
        create: (...args: unknown[]) => mockEmployeeCreate(...args),
        update: (...args: unknown[]) => mockEmployeeUpdate(...args),
        toggleActive: (...args: unknown[]) => mockEmployeeToggleActive(...args),
        deactivate: (...args: unknown[]) => mockEmployeeDeactivate(...args),
        rehire: (...args: unknown[]) => mockEmployeeRehire(...args),
        listWages: (...args: unknown[]) => mockEmployeeListWages(...args),
        createWage: (...args: unknown[]) => mockEmployeeCreateWage(...args),
    },
}))

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-provider', () => ({
    useToast: () => ({
        showSuccess: mockShowSuccess,
        showError: mockShowError,
    }),
}))

vi.mock('@/lib/api-error', () => ({
    getApiErrorMessage: (e: unknown, fallback: string) =>
        e instanceof Error ? e.message : fallback,
}))

import {
    useEmployees,
    useEmployee,
    useMyEmployee,
    useNextEmployeeCode,
    useAssignableRoles,
    useCreateEmployee,
    useUpdateEmployee,
    useToggleEmployeeActive,
    useDeactivateEmployee,
    useRehireEmployee,
    useWageHistory,
    useCreateWage,
} from '../employee-hooks'

// ── Test wrapper ──────────────────────────────────────────────────────────────

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    })
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('employee-hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('useEmployees', () => {
        it('fetches employee list without filters', async () => {
            mockEmployeeList.mockResolvedValue({
                data: {
                    data: [
                        { id: '1', name: 'Juan', code: 'EMP-001' },
                        { id: '2', name: 'Maria', code: 'EMP-002' },
                    ],
                    meta: { total: 2, page: 1 },
                },
            })

            const { result } = renderHook(() => useEmployees(), {
                wrapper: createWrapper(),
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))

            expect(mockEmployeeList).toHaveBeenCalledWith(undefined)
            expect(result.current.data?.data).toHaveLength(2)
        })

        it('fetches employee list with filters', async () => {
            mockEmployeeList.mockResolvedValue({
                data: {
                    data: [{ id: '1', name: 'Juan', code: 'EMP-001' }],
                    meta: { total: 1, page: 1 },
                },
            })

            const filters = { search: 'Juan', is_active: true }
            const { result } = renderHook(() => useEmployees(filters), {
                wrapper: createWrapper(),
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))

            expect(mockEmployeeList).toHaveBeenCalledWith(filters)
        })
    })

    describe('useEmployee', () => {
        it('fetches single employee by id', async () => {
            mockEmployeeGet.mockResolvedValue({
                data: { data: { id: 'emp-01', first_name: 'Carlos', code: 'EMP-003' } },
            })

            const { result } = renderHook(() => useEmployee('emp-01'), {
                wrapper: createWrapper(),
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))

            expect(mockEmployeeGet).toHaveBeenCalledWith('emp-01')
            expect(result.current.data?.first_name).toBe('Carlos')
        })

        it('does not fetch when id is empty', () => {
            const { result } = renderHook(() => useEmployee(''), {
                wrapper: createWrapper(),
            })

            expect(result.current.isFetching).toBe(false)
            expect(mockEmployeeGet).not.toHaveBeenCalled()
        })
    })

    describe('useMyEmployee', () => {
        it('fetches the current user employee profile', async () => {
            mockEmployeeMe.mockResolvedValue({
                data: { data: { id: 'emp-me', first_name: 'Yo', code: 'EMP-001' } },
            })

            const { result } = renderHook(() => useMyEmployee(), {
                wrapper: createWrapper(),
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))

            expect(mockEmployeeMe).toHaveBeenCalled()
            expect(result.current.data?.id).toBe('emp-me')
        })
    })

    describe('useNextEmployeeCode', () => {
        it('fetches next code when enabled', async () => {
            mockEmployeeNextCode.mockResolvedValue({
                data: { data: { code: 'EMP-010' } },
            })

            const { result } = renderHook(() => useNextEmployeeCode(true), {
                wrapper: createWrapper(),
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))

            expect(mockEmployeeNextCode).toHaveBeenCalled()
        })

        it('does not fetch when disabled', () => {
            const { result } = renderHook(() => useNextEmployeeCode(false), {
                wrapper: createWrapper(),
            })

            expect(result.current.isFetching).toBe(false)
            expect(mockEmployeeNextCode).not.toHaveBeenCalled()
        })
    })

    describe('useAssignableRoles', () => {
        it('fetches assignable roles', async () => {
            mockEmployeeAssignableRoles.mockResolvedValue({
                data: { data: ['admin', 'employee', 'inventory-manager'] },
            })

            const { result } = renderHook(() => useAssignableRoles(), {
                wrapper: createWrapper(),
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))

            expect(result.current.data).toContain('admin')
        })
    })

    describe('useCreateEmployee', () => {
        it('calls create API and shows success toast', async () => {
            mockEmployeeCreate.mockResolvedValue({
                data: { data: { id: 'new-emp', name: 'New Employee' } },
            })

            const { result } = renderHook(() => useCreateEmployee(), {
                wrapper: createWrapper(),
            })

            result.current.mutate({
                code: 'EMP-NEW',
                first_name: 'New',
                last_name: 'Employee',
                email: 'new@test.com',
                roles: ['cook'],
                branch_id: 1,
                start_date: '2026-04-15',
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))

            expect(mockEmployeeCreate).toHaveBeenCalled()
            expect(mockShowSuccess).toHaveBeenCalledWith(
                expect.stringContaining('creado'),
                expect.any(String),
            )
        })

        it('shows error toast on failure', async () => {
            mockEmployeeCreate.mockRejectedValue(new Error('Network error'))

            const { result } = renderHook(() => useCreateEmployee(), {
                wrapper: createWrapper(),
            })

            result.current.mutate({
                code: 'EMP-TEST',
                first_name: 'Test',
                last_name: 'User',
                email: 'test@test.com',
                roles: ['cook'],
                branch_id: 1,
                start_date: '2026-04-15',
            })

            await waitFor(() => expect(result.current.isError).toBe(true))

            expect(mockShowError).toHaveBeenCalled()
        })
    })

    describe('useUpdateEmployee', () => {
        it('calls update API and shows success toast', async () => {
            mockEmployeeUpdate.mockResolvedValue({
                data: { data: { id: 'emp-01', first_name: 'Updated' } },
            })

            const { result } = renderHook(() => useUpdateEmployee(), {
                wrapper: createWrapper(),
            })

            result.current.mutate({
                id: 'emp-01',
                data: { first_name: 'Updated' },
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))

            expect(mockEmployeeUpdate).toHaveBeenCalledWith('emp-01', { first_name: 'Updated' })
            expect(mockShowSuccess).toHaveBeenCalledWith(
                expect.stringContaining('actualizado'),
                expect.any(String),
            )
        })
    })

    describe('useToggleEmployeeActive', () => {
        it('calls toggleActive API and shows success toast', async () => {
            mockEmployeeToggleActive.mockResolvedValue({
                data: { data: { id: 'emp-01', is_active: false } },
            })

            const { result } = renderHook(() => useToggleEmployeeActive(), {
                wrapper: createWrapper(),
            })

            result.current.mutate('emp-01')

            await waitFor(() => expect(result.current.isSuccess).toBe(true))

            expect(mockEmployeeToggleActive).toHaveBeenCalledWith('emp-01')
            expect(mockShowSuccess).toHaveBeenCalledWith(
                expect.stringContaining('actualizado'),
                expect.any(String),
            )
        })

        it('shows error toast on failure', async () => {
            mockEmployeeToggleActive.mockRejectedValue(new Error('Toggle failed'))

            const { result } = renderHook(() => useToggleEmployeeActive(), {
                wrapper: createWrapper(),
            })

            result.current.mutate('emp-01')

            await waitFor(() => expect(result.current.isError).toBe(true))

            expect(mockShowError).toHaveBeenCalled()
        })
    })

    describe('useDeactivateEmployee', () => {
        it('calls deactivate API and shows success toast', async () => {
            mockEmployeeDeactivate.mockResolvedValue({
                data: { data: { id: 'emp-01' } },
            })

            const { result } = renderHook(() => useDeactivateEmployee(), {
                wrapper: createWrapper(),
            })

            result.current.mutate({
                id: 'emp-01',
                data: { end_date: '2026-04-15', termination_reason: 'Renuncia voluntaria' },
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))

            expect(mockEmployeeDeactivate).toHaveBeenCalledWith('emp-01', {
                end_date: '2026-04-15',
                termination_reason: 'Renuncia voluntaria',
            })
            expect(mockShowSuccess).toHaveBeenCalledWith(
                expect.stringContaining('baja'),
                expect.any(String),
            )
        })

        it('shows error toast on failure', async () => {
            mockEmployeeDeactivate.mockRejectedValue(new Error('Deactivate failed'))

            const { result } = renderHook(() => useDeactivateEmployee(), {
                wrapper: createWrapper(),
            })

            result.current.mutate({
                id: 'emp-01',
                data: { end_date: '2026-04-15', termination_reason: 'Test' },
            })

            await waitFor(() => expect(result.current.isError).toBe(true))

            expect(mockShowError).toHaveBeenCalled()
        })
    })

    describe('useRehireEmployee', () => {
        it('calls rehire API and shows success toast', async () => {
            mockEmployeeRehire.mockResolvedValue({
                data: { data: { id: 'emp-01' } },
            })

            const { result } = renderHook(() => useRehireEmployee(), {
                wrapper: createWrapper(),
            })

            result.current.mutate({
                id: 'emp-01',
                data: { branch_id: 1, start_date: '2026-05-01' },
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))

            expect(mockEmployeeRehire).toHaveBeenCalledWith('emp-01', {
                branch_id: 1,
                start_date: '2026-05-01',
            })
            expect(mockShowSuccess).toHaveBeenCalledWith(
                expect.stringContaining('reingreso'),
                expect.any(String),
            )
        })

        it('shows error toast on failure', async () => {
            mockEmployeeRehire.mockRejectedValue(new Error('Rehire failed'))

            const { result } = renderHook(() => useRehireEmployee(), {
                wrapper: createWrapper(),
            })

            result.current.mutate({
                id: 'emp-01',
                data: { branch_id: 1, start_date: '2026-05-01' },
            })

            await waitFor(() => expect(result.current.isError).toBe(true))

            expect(mockShowError).toHaveBeenCalled()
        })
    })

    describe('useWageHistory', () => {
        it('fetches wage history for employee', async () => {
            mockEmployeeListWages.mockResolvedValue({
                data: {
                    data: [
                        { id: 'wage-01', daily_wage: 250, effective_from: '2026-01-01' },
                        { id: 'wage-02', daily_wage: 300, effective_from: '2026-04-01' },
                    ],
                },
            })

            const { result } = renderHook(() => useWageHistory('emp-01'), {
                wrapper: createWrapper(),
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))

            expect(mockEmployeeListWages).toHaveBeenCalledWith('emp-01')
            expect(result.current.data).toHaveLength(2)
        })

        it('does not fetch when employeeId is empty', () => {
            const { result } = renderHook(() => useWageHistory(''), {
                wrapper: createWrapper(),
            })

            expect(result.current.isFetching).toBe(false)
            expect(mockEmployeeListWages).not.toHaveBeenCalled()
        })
    })

    describe('useCreateWage', () => {
        it('calls createWage API and shows success toast', async () => {
            mockEmployeeCreateWage.mockResolvedValue({
                data: { data: { id: 'wage-03', hourly_rate: '50.00' } },
            })

            const { result } = renderHook(() => useCreateWage(), {
                wrapper: createWrapper(),
            })

            result.current.mutate({
                employeeId: 'emp-01',
                data: { hourly_rate: 50, weekly_scheduled_hours: 48, effective_from: '2026-05-01' },
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))

            expect(mockEmployeeCreateWage).toHaveBeenCalledWith('emp-01', {
                hourly_rate: 50,
                weekly_scheduled_hours: 48,
                effective_from: '2026-05-01',
            })
            expect(mockShowSuccess).toHaveBeenCalledWith(
                expect.stringContaining('salario'),
                expect.any(String),
            )
        })

        it('shows error toast on failure', async () => {
            mockEmployeeCreateWage.mockRejectedValue(new Error('Create wage failed'))

            const { result } = renderHook(() => useCreateWage(), {
                wrapper: createWrapper(),
            })

            result.current.mutate({
                employeeId: 'emp-01',
                data: { hourly_rate: 50, weekly_scheduled_hours: 48, effective_from: '2026-05-01' },
            })

            await waitFor(() => expect(result.current.isError).toBe(true))

            expect(mockShowError).toHaveBeenCalled()
        })
    })
})
