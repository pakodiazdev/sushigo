/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import {
    EmptyState,
    ErrorState,
    NoBranchState,
    NoMatchesForFilterState,
    SkeletonGrid,
} from '../AttendanceStates'

afterEach(() => {
    cleanup()
})

// ── EmptyState Tests ───────────────────────────────────────────────────────────

describe('EmptyState', () => {
    it('renders empty state message', () => {
        const { getByText } = render(<EmptyState />)

        expect(getByText('Sin empleados activos')).toBeDefined()
        expect(
            getByText('No hay empleados activos registrados en esta sucursal.')
        ).toBeDefined()
    })

    it('renders with correct styling', () => {
        const { container } = render(<EmptyState />)

        expect(container.innerHTML).toContain('flex')
        expect(container.innerHTML).toContain('flex-col')
        expect(container.innerHTML).toContain('text-center')
    })
})

// ── ErrorState Tests ───────────────────────────────────────────────────────────

describe('ErrorState', () => {
    it('renders error state message', () => {
        const { getByText } = render(<ErrorState />)

        expect(getByText('Error al cargar')).toBeDefined()
        expect(getByText('No se pudo obtener la asistencia. Intenta recargar la página.')).toBeDefined()
    })

    it('renders with error styling', () => {
        const { container } = render(<ErrorState />)

        expect(container.innerHTML).toContain('text-red-500')
    })
})

// ── NoBranchState Tests ────────────────────────────────────────────────────────

describe('NoBranchState', () => {
    it('renders no branch selected message', () => {
        const { getByText } = render(<NoBranchState />)

        expect(getByText('Sin sucursal seleccionada')).toBeDefined()
        expect(
            getByText('Selecciona una sucursal en la barra lateral para ver la asistencia de hoy.')
        ).toBeDefined()
    })

    it('renders with correct styling', () => {
        const { container } = render(<NoBranchState />)

        expect(container.innerHTML).toContain('text-yellow-500')
    })
})

// ── NoMatchesForFilterState Tests ─────────────────────────────────────────────

describe('NoMatchesForFilterState', () => {
    it('renders the no-results message', () => {
        const { getByText } = render(<NoMatchesForFilterState onShowAll={() => {}} />)

        expect(getByText('Sin resultados para este filtro')).toBeDefined()
        expect(getByText('Ningún empleado coincide con la vista seleccionada.')).toBeDefined()
    })

    it('calls onShowAll when the "Ver todos" button is clicked', () => {
        const onShowAll = vi.fn()
        const { getByText } = render(<NoMatchesForFilterState onShowAll={onShowAll} />)

        fireEvent.click(getByText('Ver todos'))

        expect(onShowAll).toHaveBeenCalledTimes(1)
    })
})

// ── SkeletonGrid Tests ─────────────────────────────────────────────────────────

describe('SkeletonGrid', () => {
    it('renders 6 skeleton cards by default', () => {
        const { container } = render(<SkeletonGrid />)

        const skeletonCards = container.querySelectorAll('.animate-pulse')
        expect(skeletonCards.length).toBe(6)
    })

    it('renders custom number of skeleton cards', () => {
        const { container } = render(<SkeletonGrid count={3} />)

        const skeletonCards = container.querySelectorAll('.animate-pulse')
        expect(skeletonCards.length).toBe(3)
    })

    it('renders skeleton cards with correct structure', () => {
        const { container } = render(<SkeletonGrid />)

        // Check for skeleton elements with animate-pulse
        expect(container.innerHTML).toContain('animate-pulse')
    })

    it('renders in a grid layout', () => {
        const { container } = render(<SkeletonGrid />)

        const grid = container.querySelector('.attendance-card-grid') as HTMLElement
        expect(grid).not.toBeNull()
    })

    it('shares the real card grid\'s container-query column rules, not viewport breakpoints', () => {
        const { container } = render(<SkeletonGrid />)

        // Guards against the loading and loaded grids disagreeing on column count
        // for the same width — see the comment on SkeletonGrid in AttendanceStates.tsx.
        expect(container.querySelector('.attendance-grid-container')).not.toBeNull()
        expect(container.querySelector('.attendance-card-grid')).not.toBeNull()
        const grid = container.querySelector('.attendance-card-grid') as HTMLElement
        expect(grid.className).not.toContain('sm:grid-cols-2')
        expect(grid.className).not.toContain('lg:grid-cols-3')
        expect(grid.className).not.toContain('xl:grid-cols-4')
    })
})
