/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { EmployeeInfoHeader } from '../employee-info-header'
import type { Employee } from '@/types/employee'

afterEach(() => {
    cleanup()
})

const mockEmployee: Employee = {
    id: 1,
    code: 'EMP-001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-1234',
    phone_country: '+1',
    is_active: true,
    roles: ['manager', 'cook'],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
}

describe('EmployeeInfoHeader', () => {
    describe('name and code display', () => {
        it('renders employee full name', () => {
            const { getByText } = render(
                <EmployeeInfoHeader employee={mockEmployee} hasActivePeriod={true} />
            )
            expect(getByText('John Doe')).toBeDefined()
        })

        it('renders employee code', () => {
            const { getByText } = render(
                <EmployeeInfoHeader employee={mockEmployee} hasActivePeriod={true} />
            )
            expect(getByText('EMP-001')).toBeDefined()
        })
    })

    describe('status badges', () => {
        it('shows "Habilitado" badge when employee is active', () => {
            const { getByText } = render(
                <EmployeeInfoHeader employee={mockEmployee} hasActivePeriod={true} />
            )
            expect(getByText('Habilitado')).toBeDefined()
        })

        it('shows "Deshabilitado" badge when employee is inactive', () => {
            const inactiveEmployee = { ...mockEmployee, is_active: false }
            const { getByText } = render(
                <EmployeeInfoHeader employee={inactiveEmployee} hasActivePeriod={true} />
            )
            expect(getByText('Deshabilitado')).toBeDefined()
        })

        it('shows "Baja" badge when no active period', () => {
            const { getByText } = render(
                <EmployeeInfoHeader employee={mockEmployee} hasActivePeriod={false} />
            )
            expect(getByText('Baja')).toBeDefined()
        })

        it('does not show "Baja" badge when has active period', () => {
            const { queryByText } = render(
                <EmployeeInfoHeader employee={mockEmployee} hasActivePeriod={true} />
            )
            expect(queryByText('Baja')).toBeNull()
        })
    })

    describe('contact information', () => {
        it('displays email when provided', () => {
            const { getByText } = render(
                <EmployeeInfoHeader employee={mockEmployee} hasActivePeriod={true} />
            )
            expect(getByText('john.doe@example.com')).toBeDefined()
        })

        it('displays "No registrado" when email is not provided', () => {
            const noEmailEmployee = { ...mockEmployee, email: null }
            const { getAllByText } = render(
                <EmployeeInfoHeader employee={noEmailEmployee} hasActivePeriod={true} />
            )
            // At least one "No registrado" should be present
            expect(getAllByText('No registrado').length).toBeGreaterThan(0)
        })

        it('displays phone with country code when provided', () => {
            const { getByText } = render(
                <EmployeeInfoHeader employee={mockEmployee} hasActivePeriod={true} />
            )
            expect(getByText('+1 555-1234')).toBeDefined()
        })

        it('displays "No registrado" when phone is not provided', () => {
            const noPhoneEmployee = { ...mockEmployee, phone: null, phone_country: null }
            const { getAllByText } = render(
                <EmployeeInfoHeader employee={noPhoneEmployee} hasActivePeriod={true} />
            )
            expect(getAllByText('No registrado').length).toBeGreaterThan(0)
        })
    })

    describe('position roles', () => {
        it('renders all employee roles', () => {
            const { getByText } = render(
                <EmployeeInfoHeader employee={mockEmployee} hasActivePeriod={true} />
            )
            // 'manager' and 'cook' roles should be displayed with their translated labels
            expect(getByText('Gerente')).toBeDefined()
            expect(getByText('Cocinero')).toBeDefined()
        })

        it('renders "Puestos" label', () => {
            const { getByText } = render(
                <EmployeeInfoHeader employee={mockEmployee} hasActivePeriod={true} />
            )
            expect(getByText('Puestos')).toBeDefined()
        })

        it('handles empty roles array', () => {
            const noRolesEmployee = { ...mockEmployee, roles: [] }
            const { getByText, queryByText } = render(
                <EmployeeInfoHeader employee={noRolesEmployee} hasActivePeriod={true} />
            )
            expect(getByText('Puestos')).toBeDefined()
            expect(queryByText('Gerente')).toBeNull()
        })

        it('handles undefined roles', () => {
            const undefinedRolesEmployee = { ...mockEmployee, roles: undefined }
            const { getByText } = render(
                <EmployeeInfoHeader employee={undefinedRolesEmployee} hasActivePeriod={true} />
            )
            expect(getByText('Puestos')).toBeDefined()
        })
    })

    describe('section labels', () => {
        it('displays "Email" label', () => {
            const { getByText } = render(
                <EmployeeInfoHeader employee={mockEmployee} hasActivePeriod={true} />
            )
            expect(getByText('Email')).toBeDefined()
        })

        it('displays "Teléfono" label', () => {
            const { getByText } = render(
                <EmployeeInfoHeader employee={mockEmployee} hasActivePeriod={true} />
            )
            expect(getByText('Teléfono')).toBeDefined()
        })
    })
})
