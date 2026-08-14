/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { EmployeeEditCreateForm } from '../employee-edit-create-form'
import type { Employee } from '@/types/employee'

// Stand-in for the real MediaGalleryUploader (already covered by its own test suite) — keeps the
// same "media-uploader-dropzone" testid the existing tests below already assert on, but clicking
// it fires `onChange` the same way a completed upload would. This lets tests verify the rest of
// the form's state survives an upload completing mid-edit, without driving the real drag/drop +
// mediaApi flow.
vi.mock('@/components/media', () => ({
  MediaGalleryUploader: ({ onChange }: { onChange?: (galleryId?: string, ownerToken?: string) => void }) => (
    <button
      type="button"
      data-testid="media-uploader-dropzone"
      onClick={() => onChange?.('gallery-1', 'token-1')}
    >
      Simulate upload complete
    </button>
  ),
}))

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
    avatar_url: null,
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
  canManageUsers: true,
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

describe('EmployeeEditCreateForm — avatar', () => {
  it('shows the current avatar preview in edit mode', () => {
    render(<EmployeeEditCreateForm {...baseProps} />)
    expect(screen.getByRole('img', { name: 'Juan García' })).toBeDefined()
  })

  it('does not show an avatar preview in create mode (no employee yet)', () => {
    render(<EmployeeEditCreateForm {...baseProps} mode="create" employee={null} />)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('renders the media uploader dropzone so a new photo can be attached/replaced', () => {
    render(<EmployeeEditCreateForm {...baseProps} />)
    expect(screen.getByTestId('media-uploader-dropzone')).toBeDefined()
  })

  it('hides the uploader for a user without users.update editing another employee (would 403 on save)', () => {
    render(<EmployeeEditCreateForm {...baseProps} canManageUsers={false} />)
    expect(screen.queryByTestId('media-uploader-dropzone')).toBeNull()
    expect(screen.getByText('Solo un administrador puede cambiar la foto de este empleado.')).toBeDefined()
  })

  it('shows the uploader in create mode even without users.update (no existing owner to protect)', () => {
    render(<EmployeeEditCreateForm {...baseProps} mode="create" employee={null} canManageUsers={false} />)
    expect(screen.getByTestId('media-uploader-dropzone')).toBeDefined()
  })

  it('hides the uploader for an admin role that lacks the users.update permission itself', () => {
    // isAdmin (role name) and canManageUsers (users.update permission) are intentionally
    // separate booleans — the uploader must follow the permission, not the role name.
    render(<EmployeeEditCreateForm {...baseProps} isAdmin={true} canManageUsers={false} />)
    expect(screen.queryByTestId('media-uploader-dropzone')).toBeNull()
  })

  it('hides the uploader for an employee with no linked user account, even for an admin', () => {
    // UpdateEmployeeRequest prohibits media_gallery_id entirely when the target employee has
    // no linked User (nothing to attach a gallery to) — showing the uploader here would let an
    // upload fail the whole save and discard every other field submitted in the same request.
    render(<EmployeeEditCreateForm {...baseProps} employee={{ ...mockEmployee, has_user: false }} />)
    expect(screen.queryByTestId('media-uploader-dropzone')).toBeNull()
    expect(
      screen.getByText('Este empleado no tiene una cuenta de usuario vinculada, así que no puede tener foto.')
    ).toBeDefined()
  })

  it('preserves other in-progress edits when an avatar upload completes mid-edit', () => {
    render(<EmployeeEditCreateForm {...baseProps} />)

    const firstNameInput = screen.getByPlaceholderText('Juan') as HTMLInputElement
    fireEvent.change(firstNameInput, { target: { value: 'Carlos' } })
    expect(firstNameInput.value).toBe('Carlos')

    // Simulates MediaGalleryUploader's onChange firing once the upload finishes.
    fireEvent.click(screen.getByTestId('media-uploader-dropzone'))

    expect(firstNameInput.value).toBe('Carlos')
  })
})

describe('EmployeeEditCreateForm — submit guard', () => {
  it('calls onSubmit with the form values on a normal submit', async () => {
    const onSubmit = vi.fn()
    // Needs email or phone set — canEditContact is true (isAdmin) and the schema
    // requires at least one contact method, otherwise validation blocks the submit.
    const employeeWithContact = { ...mockEmployee, user: { ...mockEmployee.user, email: 'juan@sushigo.com' } }
    render(<EmployeeEditCreateForm {...baseProps} employee={employeeWithContact} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ first_name: 'Juan', last_name: 'García' })
  })

  it('does not call onSubmit when isLoading is true, even if submit is triggered', async () => {
    const onSubmit = vi.fn()
    render(<EmployeeEditCreateForm {...baseProps} onSubmit={onSubmit} isLoading={true} />)

    // The submit button is disabled while isLoading, but guardedSubmit also guards the
    // handler itself (an Enter-key submit bypasses the disabled attribute) — dispatch the
    // form's submit event directly to exercise that path.
    const form = screen.getByRole('button', { name: 'Actualizar' }).closest('form')!
    fireEvent.submit(form)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onSubmit).not.toHaveBeenCalled()
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
