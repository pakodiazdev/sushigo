import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { useAuthStore } from '@/stores/auth.store'
import { useMyEmployee } from '@/services/employee-hooks'
import { profileApi } from '@/services/profile-api'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatFirstLast } from '@/lib/format'
import type { MediaGalleryAsset } from '@/types/media'

export interface UsePerfilResult {
  displayName: string
  email: string
  avatarUrl: string | null | undefined
  /** The caller's existing avatar gallery, if any — hydrates the uploader so it
   *  can manage that gallery across page loads instead of only ever starting a
   *  brand-new one. */
  initialGalleryId: string | undefined
  initialAssets: MediaGalleryAsset[] | undefined
  isLoadingEmployee: boolean
  isUploaderBusy: boolean
  setIsUploaderBusy: (busy: boolean) => void
  onAvatarChange: (galleryId: string | undefined, ownerToken: string | undefined) => void
  onAssetsChange: () => void
  /** True after the attach mutation has failed and hasn't been retried yet. */
  attachFailed: boolean
  /** Re-submits the same gallery/token the last failed attach used — the uploader's
   *  own onChange effect won't re-fire on its own (galleryId/ownerToken don't change
   *  between the failed attempt and a retry), so this must be triggered explicitly. */
  retryAttach: () => void
  isSaving: boolean
}

export function usePerfilPage(): UsePerfilResult {
  const { showSuccess, showError } = useToast()
  const user = useAuthStore((s) => s.user)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const { data: employee, isLoading: isLoadingEmployee } = useMyEmployee()
  const [isUploaderBusy, setIsUploaderBusy] = useState(false)
  // Retained so a failed attach can be retried with the exact same params — the
  // uploader's onChange effect is keyed on [galleryId, ownerToken] and neither
  // changes between the failed attempt and a retry, so it won't re-fire on its own.
  const [pendingAvatar, setPendingAvatar] = useState<{ mediaGalleryId: string; ownerToken?: string } | null>(null)
  // True once the uploader's gallery is actually attached to this user — seeded from
  // whether they already had an avatar_gallery when the page loaded (hydration counts as
  // already attached, since MediaGalleryUploader intentionally does not re-run the attach
  // mutation for its own hydrated initial state) and flipped by a successful attach
  // mutation afterwards. Drives onAssetsChange below instead of updateAvatarMutation's own
  // isSuccess, which never becomes true for a returning user unless they upload again.
  const [isAttached, setIsAttached] = useState(() => Boolean(user?.avatar_gallery?.id))

  const updateAvatarMutation = useMutation({
    mutationFn: (params: { mediaGalleryId: string; ownerToken?: string }) =>
      profileApi.updateMyAvatar(params),
    onSuccess: async () => {
      setIsAttached(true)
      try {
        // Re-pulls /auth/me so the store's user.avatar_url updates immediately —
        // this is what makes the header reflect the change without a new login.
        // Wrapped in its own try/catch: TanStack Query runs onSuccess inside the
        // mutation's own try/catch, so letting this reject would flip an
        // already-successful PATCH /auth/me/avatar into the mutation's error
        // state (red "no se pudo guardar" banner) over an unrelated refresh
        // hiccup — the photo was saved either way.
        await refreshUser()
      } catch (error: unknown) {
        console.error('[usePerfilPage] Failed to refresh the signed-in user after saving the avatar:', error)
      }
      showSuccess('Tu foto de perfil ha sido actualizada.', 'Foto actualizada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo actualizar tu foto de perfil.'), 'Error')
    },
  })

  const onAvatarChange = (galleryId: string | undefined, ownerToken: string | undefined) => {
    if (!galleryId) {
      return
    }
    const params = { mediaGalleryId: galleryId, ownerToken }
    setPendingAvatar(params)
    updateAvatarMutation.mutate(params)
  }

  const retryAttach = () => {
    if (pendingAvatar) {
      updateAvatarMutation.mutate(pendingAvatar)
    }
  }

  // Covers every in-gallery mutation after the first attach (set-primary, remove,
  // reorder) — none of those change galleryId/ownerToken, so onAvatarChange's effect
  // never re-fires for them, yet the resolved primary photo (and therefore
  // avatarUrl()) can still change. Gated on isAttached (not updateAvatarMutation's own
  // isSuccess) so this also refreshes for a returning user managing their already-
  // hydrated gallery, not just after a fresh attach in this session.
  const onAssetsChange = () => {
    if (isAttached) {
      // .catch, not a bare void call: an uncaught rejection here would surface as an
      // unhandled promise rejection — this refresh is best-effort, same reasoning as
      // the one in updateAvatarMutation's onSuccess above.
      refreshUser().catch((error: unknown) => {
        console.error('[usePerfilPage] Failed to refresh the signed-in user after an in-gallery change:', error)
      })
    }
  }

  return {
    displayName: formatFirstLast(employee?.user) || user?.name || '',
    email: user?.email ?? '',
    avatarUrl: user?.avatar_url,
    initialGalleryId: user?.avatar_gallery?.id,
    initialAssets: user?.avatar_gallery?.assets,
    isLoadingEmployee,
    isUploaderBusy,
    setIsUploaderBusy,
    onAvatarChange,
    onAssetsChange,
    attachFailed: updateAvatarMutation.isError,
    retryAttach,
    isSaving: updateAvatarMutation.isPending,
  }
}
