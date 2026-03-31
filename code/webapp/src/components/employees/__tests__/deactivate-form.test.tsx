// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { DeactivateForm } from '@/components/employees/deactivate-form'

// Mock the useDeactivateForm hook
vi.mock('@/components/employees/use-deactivate-form', async () => {
    const { useForm } = await import('react-hook-form')
    return {
        useDeactivateForm: () => {
            const form = useForm({
                defaultValues: { end_date: '2026-03-31', termination_reason: '' },
            })
            return { form, today: '2026-03-31' }
        },
    }
})

describe('DeactivateForm', () => {
    afterEach(() => { cleanup() })

    describe('rendering', () => {
        it('renders the form title', () => {
            const { getByText } = render(
                <DeactivateForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            expect(getByText('Dar de Baja')).toBeDefined()
        })

        it('renders the description paragraph', () => {
            const { getByText } = render(
                <DeactivateForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            expect(getByText(/Al dar de baja/)).toBeDefined()
        })

        it('renders the end_date field', () => {
            const { container } = render(
                <DeactivateForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            const dateInput = container.querySelector('input[type="date"]')
            expect(dateInput).not.toBeNull()
        })

        it('renders the termination_reason textarea', () => {
            const { container } = render(
                <DeactivateForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            const textarea = container.querySelector('textarea')
            expect(textarea).not.toBeNull()
        })

        it('renders cancel button', () => {
            const { getByText } = render(
                <DeactivateForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            expect(getByText('Cancelar')).toBeDefined()
        })

        it('renders submit button with correct text', () => {
            const { getByText } = render(
                <DeactivateForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            expect(getByText('Confirmar Baja')).toBeDefined()
        })
    })

    describe('interactions', () => {
        it('calls onCancel when cancel button is clicked', () => {
            const onCancel = vi.fn()
            const { getByText } = render(
                <DeactivateForm isLoading={false} onSubmit={vi.fn()} onCancel={onCancel} />
            )
            fireEvent.click(getByText('Cancelar'))
            expect(onCancel).toHaveBeenCalledTimes(1)
        })

        it('disables buttons when isLoading is true', () => {
            const { getByText } = render(
                <DeactivateForm isLoading={true} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            const cancelBtn = getByText('Cancelar').closest('button')
            const submitBtn = getByText('Confirmar Baja').closest('button')
            expect(cancelBtn?.disabled).toBe(true)
            expect(submitBtn?.disabled).toBe(true)
        })

        it('shows spinner icon when isLoading is true', () => {
            const { container } = render(
                <DeactivateForm isLoading={true} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            const spinner = container.querySelector('.animate-spin')
            expect(spinner).not.toBeNull()
        })

        it('does not show spinner when not loading', () => {
            const { container } = render(
                <DeactivateForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            const spinner = container.querySelector('.animate-spin')
            expect(spinner).toBeNull()
        })

        it('sets max attribute on date input to today', () => {
            const { container } = render(
                <DeactivateForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement
            expect(dateInput.max).toBe('2026-03-31')
        })

        it('allows typing in termination reason textarea', () => {
            const { container } = render(
                <DeactivateForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            const textarea = container.querySelector('textarea') as HTMLTextAreaElement
            fireEvent.change(textarea, { target: { value: 'Renuncia voluntaria' } })
            expect(textarea.value).toBe('Renuncia voluntaria')
        })
    })

    describe('form styling', () => {
        it('has amber border styling for warning context', () => {
            const { container } = render(
                <DeactivateForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            const wrapper = container.firstChild as HTMLElement
            expect(wrapper?.className).toContain('border-amber-200')
        })
    })
})
