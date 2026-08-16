import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { useAuthStore } from '@/stores/auth.store'
import { useMyEmployee } from '@/services/employee-hooks'
import { profileApi } from '@/services/profile-api'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatFirstLast } from '@/lib/format'

export interface UsePerfilResult {
  displayName: string
  email: string
  avatarUrl: string | null | undefined
  isLoadingEmployee: boolean
  isUploaderBusy: boolean
  setIsUploaderBusy: (busy: boolean) => void
  onAvatarChange: (galleryId: string | undefined, ownerToken: string | undefined) => void
  onAssetsChange: () => void
  isSaving: boolean
}

export function usePerfilPage(): UsePerfilResult {
  const { showSuccess, showError } = useToast()
  const user = useAuthStore((s) => s.user)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const { data: employee, isLoading: isLoadingEmployee } = useMyEmployee()
  const [isUploaderBusy, setIsUploaderBusy] = useState(false)

  const updateAvatarMutation = useMutation({
    mutationFn: (params: { mediaGalleryId: string; ownerToken?: string }) =>
      profileApi.updateMyAvatar(params),
    onSuccess: async () => {
      // Re-pulls /auth/me so the store's user.avatar_url updates immediately —
      // this is what makes the header reflect the change without a new login.
      await refreshUser()
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
    updateAvatarMutation.mutate({ mediaGalleryId: galleryId, ownerToken })
  }

  // Covers every in-gallery mutation after the first attach (set-primary, remove,
  // reorder) — none of those change galleryId/ownerToken, so onAvatarChange's effect
  // never re-fires for them, yet the resolved primary photo (and therefore
  // avatarUrl()) can still change. Gated on isSuccess so this doesn't also fire a
  // premature refresh for the very first upload, before the initial attach mutation
  // above has actually completed.
  const onAssetsChange = () => {
    if (updateAvatarMutation.isSuccess) {
      void refreshUser()
    }
  }

  return {
    displayName: formatFirstLast(employee?.user) || user?.name || '',
    email: user?.email ?? '',
    avatarUrl: user?.avatar_url,
    isLoadingEmployee,
    isUploaderBusy,
    setIsUploaderBusy,
    onAvatarChange,
    onAssetsChange,
    isSaving: updateAvatarMutation.isPending,
  }
}
