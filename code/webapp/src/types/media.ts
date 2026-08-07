// Media Gallery Types — upload-first/attach-on-save pattern (see #377, #378)

export interface MediaGalleryAsset {
  gallery_id: string
  asset_id: string
  url: string
  filename: string
  mime_type: string
  size: number
  position: number
  is_primary: boolean
}

export interface EntityResponse<T> {
  status: number
  data: T
}
