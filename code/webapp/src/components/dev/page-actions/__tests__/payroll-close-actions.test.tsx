// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockMutate = vi.fn()
const mockInvalidateQueries = vi.fn()
let mockIsPending = false
let mockCurrentBranch: { id: number; name: string } | null = { id: 1, name: 'Main' }

vi.mock('@tanstack/react-query', () => ({
    useMutation: ({ onSuccess, onError }: {
        onSuccess?: (data: unknown) => void
        onError?: (err: unknown) => void
    }) => ({
        mutate: () => {
            mockMutate({ onSuccess, onError })
        },
        isPending: mockIsPending,
    }),
    useQueryClient: () => ({
        invalidateQueries: mockInvalidateQueries,
    }),
}))

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: (selector: (s: { currentBranch: typeof mockCurrentBranch }) => unknown) =>
        selector({ currentBranch: mockCurrentBranch }),
}))

vi.mock('@/services/payroll-devtools.service', () => ({
    seedPayrollAttendance: vi.fn(),
}))

vi.mock('@/lib/api-error', () => ({
    getApiErrorMessage: (_err: unknown, fallback: string) => fallback,
}))

import { PayrollCloseActions } from '../payroll-close-actions'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockIsPending = false
    mockCurrentBranch = { id: 1, name: 'Main' }
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PayrollCloseActions', () => {
    beforeEach(() => {
        render(<PayrollCloseActions />)
    })

    it('renders Generar button and date inputs', () => {
        expect(screen.getByRole('button', { name: /Generar asistencias/i })).toBeTruthy()
        expect(document.querySelectorAll('input[type="date"]')).toHaveLength(2)
    })

    it('renders all 6 scenario radio options', () => {
        const radios = document.querySelectorAll('input[type="radio"]')
        expect(radios).toHaveLength(6)
    })

    it('defaults to full_week scenario selected', () => {
        const radios = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
        const fullWeek = radios.find((r) => r.value === 'full_week')
        expect(fullWeek?.checked).toBe(true)
    })

    it('calls mutate when button is clicked', () => {
        fireEvent.click(screen.getByRole('button', { name: /Generar asistencias/i }))
        expect(mockMutate).toHaveBeenCalledOnce()
    })

    it('shows success result when onSuccess callback fires', async () => {
        vi.mocked(mockMutate).mockImplementationOnce(
            ({ onSuccess }: { onSuccess?: (d: unknown) => void }) => {
                onSuccess?.({ created: 5, deleted: 3, employees: ['EMP-001', 'EMP-002'] })
            },
        )

        fireEvent.click(screen.getByRole('button', { name: /Generar asistencias/i }))

        await waitFor(() => {
            expect(document.body.textContent).toContain('5 registros creados')
            expect(document.body.textContent).toContain('3 eliminados')
            expect(document.body.textContent).toContain('EMP-001, EMP-002')
        })
    })

    it('shows error message when onError callback fires', async () => {
        vi.mocked(mockMutate).mockImplementationOnce(
            ({ onError }: { onError?: (e: unknown) => void }) => {
                onError?.(new Error('Network Error'))
            },
        )

        fireEvent.click(screen.getByRole('button', { name: /Generar asistencias/i }))

        await waitFor(() => {
            expect(document.body.textContent).toContain('Error al generar asistencias')
        })
    })

    it('changing scenario radio updates selection', () => {
        const radios = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
        const latesRadio = radios.find((r) => r.value === 'with_lates')
        expect(latesRadio).toBeTruthy()
        fireEvent.click(latesRadio!)
        expect(latesRadio!.checked).toBe(true)
    })
})
