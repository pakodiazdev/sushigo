/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { EmployeeEditCreateForm } from '../employee-edit-create-form'
import type { Employee } from '@/types/employee'

afterEach(() => {
  cleanup()
})

const mockEmployee: Employee = {
  id: 'emp-1',
  code: 'EMP-001',
  user: {
    first_name: 'Juan',
    last_name: 'García',
    email: null,
    phone: null,
    phone_country: null,
  },
  is_active: true,
  attendance_exempt: false,
  vacation_entitlement_rule_key: null,
  vacation_entitlement_custom_table: null,
  has_user: true,
  roles: ['cook'],
  meta: null,
  created_at: '2026-01-01T00:00:00+00:00',
  updated_at: '2026-01-01T00:00:00+00:00',
}

const baseProps = {
  mode: 'edit' as const,
  employee: mockEmployee,
  assignableRoles: ['cook' as const],
  assignableRolesLoading: false,
  assignableRolesError: false,
  isAdmin: true,
  hasBranch: true,
  isLoading: false,
  onRefreshCode: vi.fn(),
  isRefreshingCode: false,
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  isSuggestedCodeLoading: false,
}

describe('EmployeeEditCreateForm — edit mode defaults', () => {
  it('defaults email and phone to empty strings when the employee has none registered', () => {
    render(<EmployeeEditCreateForm {...baseProps} />)

    const emailInput = screen.getByPlaceholderText('juan@example.com') as HTMLInputElement
    const phoneInput = screen.getByPlaceholderText('5512345678') as HTMLInputElement

    expect(emailInput.value).toBe('')
    expect(phoneInput.value).toBe('')
  })

  it('populates first name, last name, email and phone from the linked user', () => {
    const employeeWithContact: Employee = {
      ...mockEmployee,
      user: { ...mockEmployee.user, email: 'juan@sushigo.com', phone: '5512345678' },
    }
    render(<EmployeeEditCreateForm {...baseProps} employee={employeeWithContact} />)

    expect((screen.getByPlaceholderText('Juan') as HTMLInputElement).value).toBe('Juan')
    expect((screen.getByPlaceholderText('Perez') as HTMLInputElement).value).toBe('García')
    expect((screen.getByPlaceholderText('juan@example.com') as HTMLInputElement).value).toBe('juan@sushigo.com')
    expect((screen.getByPlaceholderText('5512345678') as HTMLInputElement).value).toBe('5512345678')
  })
})

describe('EmployeeEditCreateForm — role toggle', () => {
  it('adds a role when its toggle is checked and removes it when unchecked', () => {
    render(
      <EmployeeEditCreateForm
        {...baseProps}
        assignableRoles={['cook', 'delivery-driver']}
      />,
    )

    const cookToggle = screen.getByRole('switch', { name: 'Cocinero' })
    const driverToggle = screen.getByRole('switch', { name: 'Repartidor' })

    // Employee starts with only 'cook' assigned.
    expect(cookToggle.getAttribute('aria-checked')).toBe('true')
    expect(driverToggle.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(driverToggle)
    expect(driverToggle.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(cookToggle)
    expect(cookToggle.getAttribute('aria-checked')).toBe('false')
  })
})
