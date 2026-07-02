// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { PunctualityRange, PunctualityBonusGroup } from '@/types/punctuality'
import { rangeLabel } from '../punctuality-config-utils'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockListRanges = vi.fn()
const mockUpdateRanges = vi.fn()
const mockListBonusGroups = vi.fn()
const mockCreateBonusGroup = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/punctuality-config-api', () => ({
    punctualityConfigApi: {
        listRanges: (...args: unknown[]) => mockListRanges(...args),
        updateRanges: (...args: unknown[]) => mockUpdateRanges(...args),
        listBonusGroups: (...args: unknown[]) => mockListBonusGroups(...args),
        createBonusGroup: (...args: unknown[]) => mockCreateBonusGroup(...args),
    },
}))

vi.mock('@/components/ui/toast-context', () => ({
    useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@tanstack/react-router', () => ({
    createFileRoute: () => () => ({ component: null }),
}))

vi.mock('@/lib/route-guards', () => ({
    requirePermission: () => () => undefined,
}))

import { PunctualityConfigSection } from '@/components/settings/punctuality-config-section'
import { PunctualityConfigPage } from '../punctuality-config'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    return ({ children }: { children: ReactNode }) =>
        React.createElement(QueryClientProvider, { client: qc }, children)
}

function renderSection() {
    return render(<PunctualityConfigSection />, { wrapper: makeWrapper() })
}

const fakeRanges: PunctualityRange[] = [
    { id: '1', min_seconds: 0, max_seconds: 299, bonus_percentage: 100, sort_order: 1 },
    { id: '2', min_seconds: 300, max_seconds: null, bonus_percentage: 0, sort_order: 2 },
]

const fakeGroups: PunctualityBonusGroup[] = [
    {
        id: 'g1',
        name: 'Grupo $110 (÷6)',
        weekly_bonus_amount: 110,
        working_days_divisor: 6,
        daily_bonus_amount: 18.33,
        is_active: true,
    },
]

beforeEach(() => {
    vi.clearAllMocks()
    mockListRanges.mockResolvedValue({ data: { data: fakeRanges } })
    mockListBonusGroups.mockResolvedValue({ data: { data: [] } })
})

afterEach(() => {
    cleanup()
})

// ── rangeLabel ────────────────────────────────────────────────────────────────

describe('rangeLabel', () => {
    it('formats an open-ended range', () => {
        expect(rangeLabel(300, null)).toBe('≥ 5 min')
    })

    it('formats a bounded range', () => {
        expect(rangeLabel(0, 299)).toBe('0 – 4 min')
    })
})

// ── PunctualityConfigSection (ranges) ────────────────────────────────────────

describe('PunctualityConfigSection — ranges', () => {
    it('shows a loading message before ranges resolve', () => {
        mockListRanges.mockReturnValue(new Promise(() => {}))
        renderSection()

        expect(screen.getByText('Cargando configuración...')).toBeDefined()
    })

    it('renders the ranges heading and preview once loaded', async () => {
        renderSection()

        await waitFor(() => expect(screen.getByText('Rangos de Puntualidad')).toBeDefined())
        expect(screen.getByText(/Rangos actuales:/)).toBeDefined()
        expect(document.querySelector('h3')?.textContent).toBe('Rangos de Puntualidad')
    })

    it('disables the threshold input for the first row', async () => {
        renderSection()

        await waitFor(() => expect(screen.getByText('Rangos de Puntualidad')).toBeDefined())
        const thresholdInputs = document.querySelectorAll('input[type="number"]')
        expect((thresholdInputs[0] as HTMLInputElement).disabled).toBe(true)
    })

    it('adds a new row when "Agregar nivel" is clicked', async () => {
        renderSection()

        await waitFor(() => expect(screen.getByText('Rangos de Puntualidad')).toBeDefined())
        const rowsBefore = document.querySelectorAll('input[type="number"]').length

        fireEvent.click(screen.getByText('Agregar nivel'))

        await waitFor(() => {
            const rowsAfter = document.querySelectorAll('input[type="number"]').length
            expect(rowsAfter).toBeGreaterThan(rowsBefore)
        })
    })

    it('removes a non-first row when its delete button is clicked', async () => {
        renderSection()

        await waitFor(() => expect(screen.getByText('Rangos de Puntualidad')).toBeDefined())
        const deleteButtons = screen.getAllByLabelText('Eliminar nivel')
        expect(deleteButtons.length).toBe(2)

        fireEvent.click(deleteButtons[1]!)

        await waitFor(() => {
            expect(screen.getAllByLabelText('Eliminar nivel').length).toBe(1)
        })
    })

    it('enables submit and calls updateRanges after a field changes', async () => {
        mockUpdateRanges.mockResolvedValue({ data: { data: fakeRanges } })
        renderSection()

        await waitFor(() => expect(screen.getByText('Rangos de Puntualidad')).toBeDefined())

        const bonusInputs = document.querySelectorAll('input[type="number"][step="0.01"]')
        fireEvent.change(bonusInputs[0]!, { target: { value: '50' } })

        const submitButton = screen.getByText('Guardar cambios').closest('button')
        await waitFor(() => expect(submitButton?.disabled).toBe(false))

        fireEvent.click(submitButton!)

        await waitFor(() => expect(mockUpdateRanges).toHaveBeenCalled())
    })
})

// ── PunctualityConfigSection (bonus groups) ──────────────────────────────────

describe('PunctualityConfigSection — bonus groups', () => {
    it('shows loading text while bonus groups are fetching', async () => {
        mockListBonusGroups.mockReturnValue(new Promise(() => {}))
        renderSection()

        await waitFor(() => expect(screen.getByText('Cargando grupos...')).toBeDefined())
    })

    it('shows the "Agregar grupo" button and no table when there are no groups', async () => {
        renderSection()

        await waitFor(() => expect(screen.getByText('Grupos de Bono')).toBeDefined())
        expect(screen.getByText('Agregar grupo')).toBeDefined()
        expect(document.querySelector('table')).toBeNull()
    })

    it('renders a table row for each existing bonus group', async () => {
        mockListBonusGroups.mockResolvedValue({ data: { data: fakeGroups } })
        renderSection()

        await waitFor(() => expect(screen.getByText('Grupo $110 (÷6)')).toBeDefined())
        expect(screen.getByText('$110.00')).toBeDefined()
        expect(screen.getByText('$18.33')).toBeDefined()
    })

    it('toggles the create form and cancels back to hidden', async () => {
        renderSection()

        await waitFor(() => expect(screen.getByText('Agregar grupo')).toBeDefined())
        fireEvent.click(screen.getByText('Agregar grupo'))

        expect(screen.getByText('Guardar grupo')).toBeDefined()

        fireEvent.click(screen.getByText('Cancelar'))

        await waitFor(() => expect(screen.queryByText('Guardar grupo')).toBeNull())
    })

    it('submits the create-group form and calls createBonusGroup', async () => {
        mockCreateBonusGroup.mockResolvedValue({ data: { data: fakeGroups[0] } })
        renderSection()

        await waitFor(() => expect(screen.getByText('Agregar grupo')).toBeDefined())
        fireEvent.click(screen.getByText('Agregar grupo'))

        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Grupo nuevo' } })
        fireEvent.change(screen.getByLabelText('Monto semanal ($)'), { target: { value: '150' } })
        fireEvent.change(screen.getByLabelText('Días divisor'), { target: { value: '6' } })

        fireEvent.click(screen.getByText('Guardar grupo'))

        await waitFor(() => expect(mockCreateBonusGroup).toHaveBeenCalledWith({
            name: 'Grupo nuevo',
            weekly_bonus_amount: 150,
            working_days_divisor: 6,
        }))
    })
})

// ── PunctualityConfigPage (route) ────────────────────────────────────────────

describe('PunctualityConfigPage', () => {
    function renderPage() {
        return render(<PunctualityConfigPage />, { wrapper: makeWrapper() })
    }

    it('shows the page-level loading header before ranges resolve', () => {
        mockListRanges.mockReturnValue(new Promise(() => {}))
        renderPage()

        expect(screen.getByText('Configuración de Puntualidad')).toBeDefined()
        expect(screen.getByText('Cargando configuración...')).toBeDefined()
    })

    it('renders the h2 heading and the saved-ranges preview once loaded', async () => {
        renderPage()

        await waitFor(() => expect(document.querySelector('h2')).not.toBeNull())
        const headings = Array.from(document.querySelectorAll('h2')).map((h) => h.textContent)
        expect(headings).toContain('Rangos de Puntualidad')
        expect(screen.getByText(/Rangos actuales guardados:/)).toBeDefined()
    })
})
