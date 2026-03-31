// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { EmptySchedule, ScheduleSkeleton } from '@/components/employees/schedule-section-state'

afterEach(() => {
    cleanup()
})

describe('EmptySchedule', () => {
    it('renders the main message', () => {
        render(<EmptySchedule canCreate={true} />)

        expect(screen.getByText('Sin horario activo')).toBeDefined()
        expect(screen.getByText('Este empleado no tiene un horario vigente configurado.')).toBeDefined()
    })

    it('shows additional message when canCreate is false', () => {
        render(<EmptySchedule canCreate={false} />)

        expect(screen.getByText('El empleado no tiene un período laboral activo.')).toBeDefined()
    })

    it('hides additional message when canCreate is true', () => {
        const { container } = render(<EmptySchedule canCreate={true} />)

        // The text should not be present when canCreate is true
        const textContent = container.textContent || ''
        expect(textContent).not.toContain('El empleado no tiene un período laboral activo.')
    })
})

describe('ScheduleSkeleton', () => {
    it('renders skeleton rows', () => {
        const { container } = render(<ScheduleSkeleton />)

        // Should have 5 skeleton rows
        const rows = container.querySelectorAll('.flex.gap-4')
        expect(rows).toHaveLength(5)
    })

    it('renders animated pulse elements', () => {
        const { container } = render(<ScheduleSkeleton />)

        const pulseElements = container.querySelectorAll('.animate-pulse')
        // 1 header + 5 rows * 4 columns = 21 elements
        expect(pulseElements.length).toBeGreaterThan(0)
    })
})
