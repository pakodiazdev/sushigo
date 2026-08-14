// Media Gallery Types — upload-first/attach-on-save pattern (see #377, #378)

/**
 * Mirrors config('media.contexts') keys on the backend (code/api/config/media.php) — each
 * declares what a gallery is for and, via UploadMediaRequest, fixes the file types it will
 * accept at creation. Adding an adopter means adding a key on both sides.
 */
export type MediaContext = 'item' | 'dish' | 'avatar'

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
