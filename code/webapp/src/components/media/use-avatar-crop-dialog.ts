import { useCallback, useEffect, useState } from 'react'
import type { Area, Point } from 'react-easy-crop'
import { mediaApi } from '@/services/media-api'
import { profileApi } from '@/services/profile-api'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { cropImageToBlob } from '@/lib/canvas-crop'
import { generateOwnerToken } from '@/lib/media-validation'

// 512x512 comfortably resolves every avatar surface in the app while staying well under
// the 8000 KB upload cap at JPEG quality 0.9 (typically 50-150 KB) — see UploadMediaRequest.
const OUTPUT_SIZE = 512

export interface UseAvatarCropDialogResult {
  imageSrc: string | null
  crop: Point
  zoom: number
  setCrop: (crop: Point) => void
  setZoom: (zoom: number) => void
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void
  isSaving: boolean
  canSave: boolean
  handleSave: () => Promise<void>
}

/**
 * Owns the crop dialog's state and its whole save flow — pick a file, crop it,
 * upload the cropped result as a brand-new gallery, attach it as the caller's
 * avatar, refresh the header. There is exactly one mutation path here (unlike
 * the old multi-photo gallery manager, whose mutation was triggered indirectly
 * by several child-component callbacks), so this hook owns start to finish.
 */
export function useAvatarCropDialog(file: File | null, onSaved: () => void): UseAvatarCropDialogResult {
  const { showSuccess, showError } = useToast()
  const refreshUser = useAuthStore((s) => s.refreshUser)

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Tied to the effect's own cleanup (not just an explicit close handler) so the
  // object URL is revoked whether the dialog closes normally or the component
  // unmounts mid-crop (e.g. navigating away from /perfil).
  useEffect(() => {
    if (!file) {
      setImageSrc(null)
      return
    }
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleSave = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) {
      return
    }

    setIsSaving(true)
    try {
      const blob = await cropImageToBlob(imageSrc, croppedAreaPixels, OUTPUT_SIZE)
      const croppedFile = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' })
      // A fresh gallery every save, never reusing a prior media_gallery_id — the
      // avatar-context upload/attach pair already handles "replace my existing
      // photo" correctly server-side (UploadMediaService promotes the single new
      // asset to primary; attaching it detaches whatever was attached before), so
      // there is no gallery-id-reuse bookkeeping to carry across saves like the
      // old multi-upload gallery manager needed.
      const ownerToken = generateOwnerToken()

      const asset = await mediaApi.upload(croppedFile, { context: 'avatar', ownerToken })
      await profileApi.updateMyAvatar({ mediaGalleryId: asset.gallery_id, ownerToken })

      try {
        // Re-pulls /auth/me so the store's user.avatar_url updates immediately — a
        // refresh hiccup here must not mask an already-successful save.
        await refreshUser()
      } catch (error: unknown) {
        console.error('[useAvatarCropDialog] Failed to refresh the signed-in user after saving the avatar:', error)
      }

      showSuccess('Tu foto de perfil ha sido actualizada.', 'Foto actualizada')
      onSaved()
    } catch (error: unknown) {
      showError(getApiErrorMessage(error, 'No se pudo actualizar tu foto de perfil.'), 'Error')
    } finally {
      setIsSaving(false)
    }
  }, [imageSrc, croppedAreaPixels, onSaved, refreshUser, showSuccess, showError])

  return {
    imageSrc,
    crop,
    zoom,
    setCrop,
    setZoom,
    onCropComplete,
    isSaving,
    canSave: imageSrc !== null && croppedAreaPixels !== null,
    handleSave,
  }
}
