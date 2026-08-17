/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { AvatarCropDialog } from '../avatar-crop-dialog'

const mockHandleSave = vi.fn()
const mockSetCrop = vi.fn()
const mockSetZoom = vi.fn()
const mockOnCropComplete = vi.fn()

const mockHookState = vi.hoisted(() => ({
  imageSrc: null as string | null,
  crop: { x: 0, y: 0 },
  zoom: 1,
  isSaving: false,
  canSave: false,
}))

vi.mock('../use-avatar-crop-dialog', () => ({
  useAvatarCropDialog: () => ({
    ...mockHookState,
    setCrop: mockSetCrop,
    setZoom: mockSetZoom,
    onCropComplete: mockOnCropComplete,
    handleSave: mockHandleSave,
  }),
}))

function resetHookState() {
  mockHookState.imageSrc = 'blob:mock-url'
  mockHookState.crop = { x: 0, y: 0 }
  mockHookState.zoom = 1
  mockHookState.isSaving = false
  mockHookState.canSave = true
}

describe('AvatarCropDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetHookState()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders nothing when closed', () => {
    const { container } = render(<AvatarCropDialog isOpen={false} file={null} onClose={vi.fn()} />)

    expect(container.innerHTML).toBe('')
  })

  it('renders the crop area when open with a file', () => {
    render(<AvatarCropDialog isOpen file={new File(['x'], 'photo.jpg')} onClose={vi.fn()} />)

    expect(screen.getByTestId('avatar-crop-dialog')).toBeDefined()
    expect(screen.getByText('Ajustar foto de perfil')).toBeDefined()
  })

  it('calls onClose when the close (X) button is clicked', () => {
    const onClose = vi.fn()
    render(<AvatarCropDialog isOpen file={new File(['x'], 'photo.jpg')} onClose={onClose} />)

    fireEvent.click(screen.getByLabelText('Cerrar'))

    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Cancelar is clicked', () => {
    const onClose = vi.fn()
    render(<AvatarCropDialog isOpen file={new File(['x'], 'photo.jpg')} onClose={onClose} />)

    fireEvent.click(screen.getByText('Cancelar'))

    expect(onClose).toHaveBeenCalled()
  })

  it('calls handleSave when Guardar is clicked and canSave is true', () => {
    render(<AvatarCropDialog isOpen file={new File(['x'], 'photo.jpg')} onClose={vi.fn()} />)

    fireEvent.click(screen.getByTestId('avatar-crop-save'))

    expect(mockHandleSave).toHaveBeenCalled()
  })

  it('disables Guardar while canSave is false', () => {
    mockHookState.canSave = false
    render(<AvatarCropDialog isOpen file={new File(['x'], 'photo.jpg')} onClose={vi.fn()} />)

    expect((screen.getByTestId('avatar-crop-save') as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables Guardar and the close controls while isSaving is true', () => {
    mockHookState.isSaving = true
    render(<AvatarCropDialog isOpen file={new File(['x'], 'photo.jpg')} onClose={vi.fn()} />)

    expect((screen.getByTestId('avatar-crop-save') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByText('Cancelar') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByLabelText('Cerrar') as HTMLButtonElement).disabled).toBe(true)
  })
})
