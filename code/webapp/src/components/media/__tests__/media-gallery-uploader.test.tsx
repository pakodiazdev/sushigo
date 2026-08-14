/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MediaGalleryUploader } from '../media-gallery-uploader'

const mockUploadFiles = vi.fn()
const mockRemoveAsset = vi.fn()
const mockSetPrimaryAsset = vi.fn()
const mockMoveAsset = vi.fn()
const mockClearError = vi.fn()

const mockHookState = vi.hoisted(() => ({
  assets: [] as Array<{
    gallery_id: string
    asset_id: string
    url: string
    filename: string
    mime_type: string
    size: number
    position: number
    is_primary: boolean
  }>,
  galleryId: undefined as string | undefined,
  ownerToken: undefined as string | undefined,
  isUploading: false,
  isMutating: false,
  error: null as string | null,
}))

vi.mock('../use-media-gallery-uploader', () => ({
  useMediaGalleryUploader: () => ({
    ...mockHookState,
    uploadFiles: mockUploadFiles,
    removeAsset: mockRemoveAsset,
    setPrimaryAsset: mockSetPrimaryAsset,
    moveAsset: mockMoveAsset,
    clearError: mockClearError,
  }),
  mediaContextAccept: () => 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime',
}))

function resetHookState() {
  mockHookState.assets = []
  mockHookState.galleryId = undefined
  mockHookState.ownerToken = undefined
  mockHookState.isUploading = false
  mockHookState.isMutating = false
  mockHookState.error = null
}

describe('MediaGalleryUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetHookState()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders the drop zone', () => {
      const { getByTestId } = render(<MediaGalleryUploader context="item" />)
      expect(getByTestId('media-uploader-dropzone')).toBeDefined()
    })

    it('renders a hidden file input', () => {
      const { getByTestId } = render(<MediaGalleryUploader context="item" />)
      const input = getByTestId('media-uploader-input') as HTMLInputElement
      expect(input.type).toBe('file')
      expect(input.multiple).toBe(true)
    })

    it('renders the given label', () => {
      const { getByText } = render(<MediaGalleryUploader context="item" label="Item photos" />)
      expect(getByText('Item photos')).toBeDefined()
    })

    it('shows the uploading indicator while isUploading is true', () => {
      mockHookState.isUploading = true
      const { getByText } = render(<MediaGalleryUploader context="item" />)
      expect(getByText('Uploading…')).toBeDefined()
    })

    it('does not render the assets grid when there are no assets', () => {
      const { queryByTestId } = render(<MediaGalleryUploader context="item" />)
      expect(queryByTestId('media-uploader-assets')).toBeNull()
    })

    it('does not render an error banner when there is no error', () => {
      const { queryByTestId } = render(<MediaGalleryUploader context="item" />)
      expect(queryByTestId('media-uploader-error')).toBeNull()
    })
  })

  describe('file selection', () => {
    it('calls uploadFiles with the selected files', () => {
      const { getByTestId } = render(<MediaGalleryUploader context="item" />)
      const input = getByTestId('media-uploader-input') as HTMLInputElement
      const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })

      fireEvent.change(input, { target: { files: [file] } })

      expect(mockUploadFiles).toHaveBeenCalledTimes(1)
      expect(mockUploadFiles.mock.calls[0]?.[0]?.[0]).toBe(file)
    })

    it('disables the input while uploading', () => {
      mockHookState.isUploading = true
      const { getByTestId } = render(<MediaGalleryUploader context="item" />)
      const input = getByTestId('media-uploader-input') as HTMLInputElement
      expect(input.disabled).toBe(true)
    })

    it('disables the input when the disabled prop is set', () => {
      const { getByTestId } = render(<MediaGalleryUploader context="item" disabled />)
      const input = getByTestId('media-uploader-input') as HTMLInputElement
      expect(input.disabled).toBe(true)
    })
  })

  describe('drag and drop', () => {
    it('calls uploadFiles with the dropped files', () => {
      const { getByTestId } = render(<MediaGalleryUploader context="item" />)
      const dropzone = getByTestId('media-uploader-dropzone')
      const file = new File(['x'], 'roll.png', { type: 'image/png' })

      fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })

      expect(mockUploadFiles).toHaveBeenCalledTimes(1)
    })

    it('does not call uploadFiles when the drop carries no files', () => {
      const { getByTestId } = render(<MediaGalleryUploader context="item" />)
      const dropzone = getByTestId('media-uploader-dropzone')

      fireEvent.drop(dropzone, { dataTransfer: { files: [] } })

      expect(mockUploadFiles).not.toHaveBeenCalled()
    })

    it('tracks dragOver/dragLeave without throwing', () => {
      const { getByTestId } = render(<MediaGalleryUploader context="item" />)
      const dropzone = getByTestId('media-uploader-dropzone')

      expect(() => {
        fireEvent.dragOver(dropzone)
        fireEvent.dragLeave(dropzone)
      }).not.toThrow()
    })
  })

  describe('click to browse', () => {
    it('forwards a click on the dropzone to the hidden file input', () => {
      const { getByTestId } = render(<MediaGalleryUploader context="item" />)
      const input = getByTestId('media-uploader-input') as HTMLInputElement
      const clickSpy = vi.spyOn(input, 'click')

      fireEvent.click(getByTestId('media-uploader-dropzone'))

      expect(clickSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('error banner', () => {
    it('shows the error message', () => {
      mockHookState.error = 'Something went wrong'
      const { getByTestId } = render(<MediaGalleryUploader context="item" />)
      expect(getByTestId('media-uploader-error').textContent).toContain('Something went wrong')
    })

    it('calls clearError when dismissed', () => {
      mockHookState.error = 'Something went wrong'
      const { getByLabelText } = render(<MediaGalleryUploader context="item" />)

      fireEvent.click(getByLabelText('Dismiss error'))

      expect(mockClearError).toHaveBeenCalledTimes(1)
    })
  })

  describe('asset thumbnails', () => {
    beforeEach(() => {
      mockHookState.assets = [
        {
          gallery_id: 'gallery-1',
          asset_id: 'asset-1',
          url: 'https://api.sushigo.local/storage/media/a.jpg',
          filename: 'a.jpg',
          mime_type: 'image/jpeg',
          size: 100,
          position: 0,
          is_primary: true,
        },
        {
          gallery_id: 'gallery-1',
          asset_id: 'asset-2',
          url: 'https://api.sushigo.local/storage/media/b.jpg',
          filename: 'b.jpg',
          mime_type: 'image/jpeg',
          size: 100,
          position: 1,
          is_primary: false,
        },
      ]
    })

    it('renders one thumbnail per asset', () => {
      const { getAllByTestId } = render(<MediaGalleryUploader context="item" />)
      expect(getAllByTestId('media-uploader-asset')).toHaveLength(2)
    })

    it('renders an <img> for an image asset', () => {
      const { getAllByTestId } = render(<MediaGalleryUploader context="item" />)
      const [firstAsset] = getAllByTestId('media-uploader-asset')
      expect(firstAsset!.querySelector('img')).not.toBeNull()
      expect(firstAsset!.querySelector('video')).toBeNull()
    })

    it('renders a <video> instead of a broken <img> for a video asset', () => {
      mockHookState.assets = [
        {
          gallery_id: 'gallery-1',
          asset_id: 'asset-1',
          url: 'https://api.sushigo.local/storage/media/clip.mp4',
          filename: 'clip.mp4',
          mime_type: 'video/mp4',
          size: 100,
          position: 0,
          is_primary: true,
        },
      ]
      const { getAllByTestId } = render(<MediaGalleryUploader context="item" />)
      const [asset] = getAllByTestId('media-uploader-asset')
      expect(asset!.querySelector('video')).not.toBeNull()
      expect(asset!.querySelector('img')).toBeNull()
    })

    it('marks the primary asset with a badge', () => {
      const { getByText } = render(<MediaGalleryUploader context="item" />)
      expect(getByText('Primary')).toBeDefined()
    })

    it('calls removeAsset with the asset id', () => {
      const { getAllByLabelText } = render(<MediaGalleryUploader context="item" />)
      fireEvent.click(getAllByLabelText('Remove photo')[0]!)
      expect(mockRemoveAsset).toHaveBeenCalledWith('asset-1')
    })

    it('calls setPrimaryAsset for a non-primary asset', () => {
      const { getAllByLabelText } = render(<MediaGalleryUploader context="item" />)
      fireEvent.click(getAllByLabelText('Set as primary')[1]!)
      expect(mockSetPrimaryAsset).toHaveBeenCalledWith('asset-2')
    })

    it('disables "set as primary" for the already-primary asset', () => {
      const { getAllByLabelText } = render(<MediaGalleryUploader context="item" />)
      const button = getAllByLabelText('Set as primary')[0] as HTMLButtonElement
      expect(button.disabled).toBe(true)
    })

    it('disables "move left" on the first asset', () => {
      const { getAllByLabelText } = render(<MediaGalleryUploader context="item" />)
      const button = getAllByLabelText('Move left')[0] as HTMLButtonElement
      expect(button.disabled).toBe(true)
    })

    it('disables "move right" on the last asset', () => {
      const { getAllByLabelText } = render(<MediaGalleryUploader context="item" />)
      const button = getAllByLabelText('Move right')[1] as HTMLButtonElement
      expect(button.disabled).toBe(true)
    })

    it('calls moveAsset with the direction when reordering right', () => {
      const { getAllByLabelText } = render(<MediaGalleryUploader context="item" />)
      fireEvent.click(getAllByLabelText('Move right')[0]!)
      expect(mockMoveAsset).toHaveBeenCalledWith('asset-1', 'right')
    })

    it('calls moveAsset with the direction when reordering left', () => {
      const { getAllByLabelText } = render(<MediaGalleryUploader context="item" />)
      fireEvent.click(getAllByLabelText('Move left')[1]!)
      expect(mockMoveAsset).toHaveBeenCalledWith('asset-2', 'left')
    })

    it('disables every thumbnail action button when disabled is true, even ones a bare index check would allow', () => {
      const { getAllByLabelText } = render(<MediaGalleryUploader context="item" disabled />)
      const removeButtons = getAllByLabelText('Remove photo') as HTMLButtonElement[]
      const primaryButtons = getAllByLabelText('Set as primary') as HTMLButtonElement[]
      const leftButtons = getAllByLabelText('Move left') as HTMLButtonElement[]
      const rightButtons = getAllByLabelText('Move right') as HTMLButtonElement[]

      expect(removeButtons.every((btn) => btn.disabled)).toBe(true)
      expect(primaryButtons.every((btn) => btn.disabled)).toBe(true)
      // asset-2 (index 1) isn't the first/last, so only `disabled` explains it being locked
      expect(leftButtons[1]!.disabled).toBe(true)
      expect(rightButtons[0]!.disabled).toBe(true)
    })

    it('disables every thumbnail action button while isMutating is true', () => {
      mockHookState.isMutating = true
      const { getAllByLabelText } = render(<MediaGalleryUploader context="item" />)

      expect(getAllByLabelText('Remove photo').every((btn) => (btn as HTMLButtonElement).disabled)).toBe(true)
      expect(getAllByLabelText('Set as primary').every((btn) => (btn as HTMLButtonElement).disabled)).toBe(true)
    })

    it('does not call removeAsset/setPrimaryAsset when disabled', () => {
      const { getAllByLabelText } = render(<MediaGalleryUploader context="item" disabled />)
      fireEvent.click(getAllByLabelText('Remove photo')[0]!)
      fireEvent.click(getAllByLabelText('Set as primary')[1]!)
      expect(mockRemoveAsset).not.toHaveBeenCalled()
      expect(mockSetPrimaryAsset).not.toHaveBeenCalled()
    })
  })

  describe('disabled dropzone', () => {
    it('ignores a drop while disabled instead of relying solely on the native disabled attribute', () => {
      const { getByTestId } = render(<MediaGalleryUploader context="item" disabled />)
      const dropzone = getByTestId('media-uploader-dropzone')
      const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })

      fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })

      expect(mockUploadFiles).not.toHaveBeenCalled()
    })
  })

  describe('onChange callback', () => {
    it('fires with the current galleryId and ownerToken', async () => {
      mockHookState.galleryId = 'gallery-1'
      mockHookState.ownerToken = 'token-1'
      const onChange = vi.fn()

      render(<MediaGalleryUploader context="item" onChange={onChange} />)

      await waitFor(() => expect(onChange).toHaveBeenCalledWith('gallery-1', 'token-1'))
    })

    it('fires with undefined when nothing has been uploaded', async () => {
      const onChange = vi.fn()

      render(<MediaGalleryUploader context="item" onChange={onChange} />)

      await waitFor(() => expect(onChange).toHaveBeenCalledWith(undefined, undefined))
    })
  })

  describe('onBusyChange callback', () => {
    it('fires with true while isUploading is true', async () => {
      mockHookState.isUploading = true
      const onBusyChange = vi.fn()

      render(<MediaGalleryUploader context="item" onBusyChange={onBusyChange} />)

      await waitFor(() => expect(onBusyChange).toHaveBeenCalledWith(true))
    })

    it('fires with true while isMutating is true', async () => {
      mockHookState.isMutating = true
      const onBusyChange = vi.fn()

      render(<MediaGalleryUploader context="item" onBusyChange={onBusyChange} />)

      await waitFor(() => expect(onBusyChange).toHaveBeenCalledWith(true))
    })

    it('fires with false when neither uploading, mutating, nor errored', async () => {
      const onBusyChange = vi.fn()

      render(<MediaGalleryUploader context="item" onBusyChange={onBusyChange} />)

      await waitFor(() => expect(onBusyChange).toHaveBeenCalledWith(false))
    })

    it('fires with true while an upload error is unresolved, so a failed upload cannot be silently ignored', async () => {
      mockHookState.error = 'Failed to upload "photo.jpg": User does not have the right permissions.'
      const onBusyChange = vi.fn()

      render(<MediaGalleryUploader context="item" onBusyChange={onBusyChange} />)

      await waitFor(() => expect(onBusyChange).toHaveBeenCalledWith(true))
    })
  })
})
