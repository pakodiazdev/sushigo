// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { RehireForm } from '@/components/employees/rehire-form'

const mockBranch = { id: 1, name: 'Sucursal Central', code: 'SC' }

// Mock the useRehireForm hook
vi.mock('@/components/employees/use-rehire-form', async () => {
    const { useForm } = await import('react-hook-form')
    return {
        useRehireForm: () => {
            const form = useForm({
                defaultValues: { start_date: '2026-03-31' },
            })
            return { form, today: '2026-03-31', effectiveBranch: mockBranch }
        },
    }
})

describe('RehireForm', () => {
    afterEach(() => { cleanup() })

    describe('rendering', () => {
        it('renders the form title', () => {
            const { getByText } = render(
                <RehireForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            expect(getByText('Reingreso')).toBeDefined()
        })

        it('renders start_date input', () => {
            const { container } = render(
                <RehireForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            const dateInput = container.querySelector('input[type="date"]')
            expect(dateInput).not.toBeNull()
        })

        it('renders cancel button', () => {
            const { getByText } = render(
                <RehireForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            expect(getByText('Cancelar')).toBeDefined()
        })

        it('renders confirm button', () => {
            const { getByText } = render(
                <RehireForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            expect(getByText('Confirmar Reingreso')).toBeDefined()
        })

        it('shows branch name when effectiveBranch is present', () => {
            const { getByText } = render(
                <RehireForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            expect(getByText('Sucursal Central')).toBeDefined()
        })

        it('sets max attribute on date input to today', () => {
            const { container } = render(
                <RehireForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement
            expect(dateInput.max).toBe('2026-03-31')
        })
    })

    describe('interactions', () => {
        it('calls onCancel when cancel button is clicked', () => {
            const onCancel = vi.fn()
            const { getByText } = render(
                <RehireForm isLoading={false} onSubmit={vi.fn()} onCancel={onCancel} />
            )
            fireEvent.click(getByText('Cancelar'))
            expect(onCancel).toHaveBeenCalledTimes(1)
        })

        it('disables cancel button when isLoading is true', () => {
            const { getByText } = render(
                <RehireForm isLoading={true} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            const cancelBtn = getByText('Cancelar').closest('button')
            expect(cancelBtn?.disabled).toBe(true)
        })

        it('shows spinner when isLoading is true', () => {
            const { container } = render(
                <RehireForm isLoading={true} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            const spinner = container.querySelector('.animate-spin')
            expect(spinner).not.toBeNull()
        })

        it('does not show spinner when not loading', () => {
            const { container } = render(
                <RehireForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            const spinner = container.querySelector('.animate-spin')
            expect(spinner).toBeNull()
        })
    })

    describe('form styling', () => {
        it('has green border styling for re-hire context', () => {
            const { container } = render(
                <RehireForm isLoading={false} onSubmit={vi.fn()} onCancel={vi.fn()} />
            )
            const wrapper = container.firstChild as HTMLElement
            expect(wrapper?.className).toContain('border-green-200')
        })
    })
})
