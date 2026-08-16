import { apiClient } from '@/lib/api-client'
import type { EntityResponse } from '@/types/media'
import type { User } from '@/types/auth'

export interface UpdateMyAvatarParams {
  mediaGalleryId: string
  ownerToken?: string
}

export const profileApi = {
  updateMyAvatar: async (params: UpdateMyAvatarParams): Promise<User> => {
    const response = await apiClient.patch<EntityResponse<User>>('/auth/me/avatar', {
      media_gallery_id: params.mediaGalleryId,
      owner_token: params.ownerToken,
    })
    return response.data.data
  },
}
