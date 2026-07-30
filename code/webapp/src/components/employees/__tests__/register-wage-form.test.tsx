/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { RegisterWageForm } from '../register-wage-form'

vi.mock('@/services/employee-hooks', () => ({
    useCreateWage: vi.fn().mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
    }),
}))

describe('RegisterWageForm', () => {
    const mockOnSuccess = vi.fn()
    const mockOnCancel = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
    })

    function renderForm() {
        render(
            <RegisterWageForm
                employeeId="employee-1"
                onSuccess={mockOnSuccess}
                onCancel={mockOnCancel}
            />,
        )
    }

    it('updates neto and diario when bruto semanal changes', () => {
        renderForm()

        const brutoInput = screen.getByPlaceholderText('2,400') as HTMLInputElement
        fireEvent.change(brutoInput, { target: { value: '2400' } })

        expect(brutoInput.value).toBe('2400')
        const dailyInput = screen.getByPlaceholderText('342.86') as HTMLInputElement
        expect(Number(dailyInput.value)).toBeCloseTo(2400 / 7, 1)
    })

    it('falls back to 0 when bruto semanal is cleared', () => {
        renderForm()

        const brutoInput = screen.getByPlaceholderText('2,400') as HTMLInputElement
        fireEvent.change(brutoInput, { target: { value: '2400' } })
        fireEvent.change(brutoInput, { target: { value: '' } })

        expect(brutoInput.value).toBe('')
    })

    it('updates bruto and neto when salario diario changes', () => {
        renderForm()

        const dailyInput = screen.getByPlaceholderText('342.86') as HTMLInputElement
        fireEvent.change(dailyInput, { target: { value: '300' } })

        const brutoInput = screen.getByPlaceholderText('2,400') as HTMLInputElement
        expect(Number(brutoInput.value)).toBeCloseTo(2100, 0)
    })

    it('updates bruto and diario when neto semanal changes', () => {
        renderForm()

        const netoInput = screen.getByPlaceholderText('2,100') as HTMLInputElement
        fireEvent.change(netoInput, { target: { value: '2100' } })

        expect(netoInput.value).toBe('2100')
    })

    it('updates weekly scheduled hours', () => {
        renderForm()

        const hoursInput = screen.getByDisplayValue('48') as HTMLInputElement
        fireEvent.change(hoursInput, { target: { value: '40' } })

        expect(hoursInput.value).toBe('40')
    })

    it('updates hourly rate', () => {
        renderForm()

        const hourlyRateInput = screen.getByPlaceholderText('0.00') as HTMLInputElement
        fireEvent.change(hourlyRateInput, { target: { value: '55.5' } })

        expect(hourlyRateInput.value).toBe('55.5')
    })
})
