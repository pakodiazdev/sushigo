import { useCallback, useMemo, useRef, useState } from 'react'
import { mediaApi } from '@/services/media-api'
import { getApiErrorMessage } from '@/lib/api-error'
import type { MediaContext, MediaGalleryAsset } from '@/types/media'

// Mirrors config('media.contexts') and UploadMediaRequest's 8000 KB cap
// (code/api/config/media.php, code/api/app/Http/Requests/Media/UploadMediaRequest.php)
// for immediate client-side feedback — the backend remains the source of truth, and
// re-validates every upload against the context declared here (or, for a gallery this
// hook is reusing, the context that gallery was actually created with).
const MEDIA_CONTEXT_EXTENSIONS: Record<MediaContext, readonly string[]> = {
  item: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov'],
  dish: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov'],
  avatar: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
}

const EXTENSION_MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
}

/** Value for the file input's `accept` attribute — restricts the OS file picker per context. */
export function mediaContextAccept(context: MediaContext): string {
  return MEDIA_CONTEXT_EXTENSIONS[context].map((extension) => EXTENSION_MIME_TYPES[extension]).join(',')
}

const MAX_FILE_SIZE_BYTES = 8000 * 1024

// owner_token is a bearer-style credential (see doc/architecture/media/media-architecture.en.md
// §5.1): a predictable fallback would let anyone guess it and claim someone else's in-progress
// gallery, so unlike generateToastId() in components/ui/toast-provider.tsx (a harmless UI id,
// which degrades to a counter), this fails loudly instead of degrading to a weaker token.
function generateOwnerToken(): string {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new TypeError('A secure random number generator is required to upload media (crypto.randomUUID unavailable).')
  }
  return crypto.randomUUID()
}

function fileExtension(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? ''
}

function validateFile(file: File, allowedExtensions: readonly string[]): string | null {
  if (!allowedExtensions.includes(fileExtension(file))) {
    return `"${file.name}" is not a supported file type.`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" exceeds the 8000 KB upload limit.`
  }
  return null
}

export interface UseMediaGalleryUploaderResult {
  assets: MediaGalleryAsset[]
  /** Undefined until at least one asset exists this session — never sent for an emptied gallery. */
  galleryId: string | undefined
  ownerToken: string | undefined
  isUploading: boolean
  /** True while a remove/set-primary/reorder call is in flight — gate thumbnail controls on this too. */
  isMutating: boolean
  error: string | null
  uploadFiles: (files: FileList | File[]) => Promise<void>
  removeAsset: (assetId: string) => Promise<void>
  setPrimaryAsset: (assetId: string) => Promise<void>
  moveAsset: (assetId: string, direction: 'left' | 'right') => Promise<void>
  clearError: () => void
}

export function useMediaGalleryUploader(context: MediaContext): UseMediaGalleryUploaderResult {
  const [assets, setAssets] = useState<MediaGalleryAsset[]>([])
  const [isUploading, setIsUploading] = useState(false)
  // Guards removeAsset/setPrimaryAsset/moveAsset against overlapping calls — e.g. a rapid
  // double-click on a reorder arrow before the first click's request resolves would otherwise
  // let two calls both read the same pre-move `assets` snapshot and race to mutate the server.
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ownerTokenRef = useRef<string | undefined>(undefined)
  const galleryIdRef = useRef<string | undefined>(undefined)

  // MEDIA_CONTEXT_EXTENSIONS[context] is already a stable module-level array reference per
  // context key — useMemo just keeps this from re-deriving on every render for no reason.
  const allowedExtensions = useMemo(() => MEDIA_CONTEXT_EXTENSIONS[context], [context])

  const clearError = useCallback(() => setError(null), [])

  const uploadOne = useCallback(async (file: File) => {
    ownerTokenRef.current ??= generateOwnerToken()

    const asset = await mediaApi.upload(file, {
      mediaGalleryId: galleryIdRef.current,
      ownerToken: ownerTokenRef.current,
      context,
    })
    galleryIdRef.current = asset.gallery_id
    setAssets((prev) => [...prev, asset])
  }, [context])

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) {
      return
    }

    setError(null)
    setIsUploading(true)
    // Every file gets its own attempt: one failure (validation or API) must not silently
    // abort the rest of the batch, and the final error reflects everything that actually
    // failed rather than just the first or last message overwriting the others.
    const failures: string[] = []
    try {
      for (const file of fileArray) {
        const validationError = validateFile(file, allowedExtensions)
        if (validationError) {
          failures.push(validationError)
          continue
        }
        try {
          // Sequential, not Promise.all: each upload after the first must know the
          // gallery_id the previous one returned, so they can't run concurrently.
          await uploadOne(file)
        } catch (err: unknown) {
          failures.push(getApiErrorMessage(err, `Failed to upload "${file.name}"`))
        }
      }
    } finally {
      setIsUploading(false)
    }
    setError(failures.length > 0 ? failures.join(' ') : null)
  }, [uploadOne, allowedExtensions])

  const removeAsset = useCallback(async (assetId: string) => {
    if (isMutating) {
      return
    }
    setError(null)
    setIsMutating(true)
    try {
      await mediaApi.deleteAsset(assetId, ownerTokenRef.current)
      setAssets((prev) => {
        const removed = prev.find((asset) => asset.asset_id === assetId)
        const remaining = prev.filter((asset) => asset.asset_id !== assetId)
        if (!removed?.is_primary || remaining.length === 0) {
          return remaining
        }
        // DeleteMediaAssetService promotes the next asset by position server-side when the
        // deleted one was primary — mirror that locally, or the gallery shows no primary at
        // all until something else happens to refetch it.
        const nextPrimaryId = [...remaining].sort((a, b) => a.position - b.position)[0]!.asset_id
        return remaining.map((asset) =>
          asset.asset_id === nextPrimaryId ? { ...asset, is_primary: true } : asset
        )
      })
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to remove photo'))
    } finally {
      setIsMutating(false)
    }
  }, [isMutating])

  const setPrimaryAsset = useCallback(async (assetId: string) => {
    if (isMutating) {
      return
    }
    setError(null)
    setIsMutating(true)
    try {
      const updated = await mediaApi.updateAsset(assetId, {
        is_primary: true,
        owner_token: ownerTokenRef.current,
      })
      setAssets((prev) =>
        prev.map((asset) => (asset.asset_id === assetId ? updated : { ...asset, is_primary: false }))
      )
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to set primary photo'))
    } finally {
      setIsMutating(false)
    }
  }, [isMutating])

  const moveAsset = useCallback(async (assetId: string, direction: 'left' | 'right') => {
    if (isMutating) {
      return
    }
    setError(null)
    const index = assets.findIndex((asset) => asset.asset_id === assetId)
    const targetIndex = direction === 'left' ? index - 1 : index + 1
    if (index === -1 || targetIndex < 0 || targetIndex >= assets.length) {
      return
    }

    const current = assets[index]!
    const target = assets[targetIndex]!

    setIsMutating(true)
    // Sequential, not Promise.all: swapping two positions is two independent PATCHes (there's
    // no atomic batch-reorder endpoint), so firing them concurrently risks the first succeeding
    // and the second failing, which would leave two assets sharing the same position server-side
    // while the UI still shows the old (now wrong) order. Doing them one at a time and rolling
    // the first back if the second fails keeps that window as small as it can be client-side.
    // isMutating (checked by the component to disable every thumbnail control while true) also
    // prevents a second overlapping moveAsset call — e.g. a rapid double-click on an arrow —
    // from reading this same pre-swap `assets` snapshot and racing this one.
    let updatedCurrent: MediaGalleryAsset
    try {
      updatedCurrent = await mediaApi.updateAsset(current.asset_id, {
        position: target.position,
        owner_token: ownerTokenRef.current,
      })
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to reorder photos'))
      setIsMutating(false)
      return
    }

    try {
      const updatedTarget = await mediaApi.updateAsset(target.asset_id, {
        position: current.position,
        owner_token: ownerTokenRef.current,
      })
      setAssets((prev) =>
        prev
          .map((asset) => {
            if (asset.asset_id === updatedCurrent.asset_id) return updatedCurrent
            if (asset.asset_id === updatedTarget.asset_id) return updatedTarget
            return asset
          })
          .sort((a, b) => a.position - b.position)
      )
    } catch (err: unknown) {
      try {
        await mediaApi.updateAsset(current.asset_id, { position: current.position, owner_token: ownerTokenRef.current })
      } catch {
        // Best-effort rollback — without a GET-gallery endpoint there's no way to resync
        // from server truth if this also fails; the user-facing error below still fires.
      }
      setError(getApiErrorMessage(err, 'Failed to reorder photos'))
    } finally {
      setIsMutating(false)
    }
  }, [assets, isMutating])

  return {
    assets,
    // galleryIdRef/ownerTokenRef intentionally keep pointing at the same (now-empty) gallery
    // after the last asset is removed, so a later upload in this session resumes it instead of
    // starting a brand new one — UploadMediaService re-primaries into a genuinely empty gallery
    // (max(position) is null), and this avoids leaving an abandoned gallery per remove-then-
    // reupload cycle. Only the *exposed* value is gated on assets.length, so the parent form
    // never attaches an empty gallery on save.
    galleryId: assets.length > 0 ? galleryIdRef.current : undefined,
    ownerToken: assets.length > 0 ? ownerTokenRef.current : undefined,
    isUploading,
    isMutating,
    error,
    uploadFiles,
    removeAsset,
    setPrimaryAsset,
    moveAsset,
    clearError,
  }
}
