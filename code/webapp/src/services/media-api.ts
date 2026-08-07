import { apiClient } from '@/lib/api-client'
import type { EntityResponse, MediaGalleryAsset } from '@/types/media'

export interface UploadMediaParams {
  mediaGalleryId?: string
  ownerToken?: string
}

export interface UpdateMediaAssetParams {
  position?: number
  is_primary?: boolean
  owner_token?: string
}

export const mediaApi = {
  upload: async (file: File, params: UploadMediaParams = {}): Promise<MediaGalleryAsset> => {
    const formData = new FormData()
    formData.append('file', file)
    if (params.mediaGalleryId) {
      formData.append('media_gallery_id', params.mediaGalleryId)
    }
    if (params.ownerToken) {
      formData.append('owner_token', params.ownerToken)
    }

    // apiClient defaults to 'Content-Type: application/json', which would make axios
    // JSON.stringify() this FormData instead of sending it as multipart. Setting the
    // header to undefined removes it so the browser sets 'multipart/form-data' itself,
    // including the boundary — a manually-set 'multipart/form-data' value has no boundary
    // and the browser will not add one once the header has been explicitly set.
    const response = await apiClient.post<EntityResponse<MediaGalleryAsset>>('/media/upload', formData, {
      headers: { 'Content-Type': undefined },
    })
    return response.data.data
  },

  updateAsset: async (assetId: string, params: UpdateMediaAssetParams): Promise<MediaGalleryAsset> => {
    const response = await apiClient.patch<EntityResponse<MediaGalleryAsset>>(`/media/assets/${assetId}`, params)
    return response.data.data
  },

  deleteAsset: async (assetId: string, ownerToken?: string): Promise<void> => {
    await apiClient.delete(`/media/assets/${assetId}`, {
      data: ownerToken ? { owner_token: ownerToken } : undefined,
    })
  },
}
