import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Star, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaGalleryUploader } from './use-media-gallery-uploader'

export interface MediaGalleryUploaderProps {
  label?: string
  disabled?: boolean
  /** Fires whenever the resulting gallery changes — wire into react-hook-form via setValue. */
  onChange?: (galleryId: string | undefined, ownerToken: string | undefined) => void
  /**
   * Fires whenever an upload/remove/set-primary/reorder call is in flight, OR a prior upload
   * failed and the error hasn't been dismissed yet. The parent form must disable its own submit
   * button while this is true. Two failure modes this guards against:
   *  - A submit that races an in-flight upload sends media_gallery_id as still-undefined (assets
   *    hasn't been updated yet) and the entity saves without the photo, which then finishes
   *    uploading into an orphaned gallery.
   *  - A submit that follows a *failed* upload (e.g. missing media.upload permission) would
   *    otherwise silently save the entity without the photo the user tried to add, with no
   *    indication anything went wrong. Keeping submit blocked until the error is dismissed forces
   *    the user to consciously acknowledge "proceed without this photo" rather than have it
   *    happen for them.
   */
  onBusyChange?: (isBusy: boolean) => void
}

export function MediaGalleryUploader({
  label = 'Photos',
  disabled = false,
  onChange,
  onBusyChange,
}: Readonly<MediaGalleryUploaderProps>) {
  const {
    assets,
    galleryId,
    ownerToken,
    isUploading,
    isMutating,
    error,
    uploadFiles,
    removeAsset,
    setPrimaryAsset,
    moveAsset,
    clearError,
  } = useMediaGalleryUploader()

  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Read the latest onChange/onBusyChange via a ref instead of listing them as dependencies: the
  // parent (e.g. an inline arrow function calling react-hook-form's setValue) commonly passes a
  // new function reference on every render, and these effects must only re-fire when the value
  // they report actually changes — not on every parent re-render — while still never calling a
  // stale callback.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onBusyChangeRef = useRef(onBusyChange)
  onBusyChangeRef.current = onBusyChange

  useEffect(() => {
    onChangeRef.current?.(galleryId, ownerToken)
  }, [galleryId, ownerToken])

  useEffect(() => {
    onBusyChangeRef.current?.(isUploading || isMutating || error !== null)
  }, [isUploading, isMutating, error])

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }
    void uploadFiles(files)
  }

  const isDisabled = disabled || isUploading || isMutating

  return (
    <div className="space-y-3">
      {label && <span className="block text-sm font-medium text-foreground">{label}</span>}

      <button
        type="button"
        data-testid="media-uploader-dropzone"
        disabled={isDisabled}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          // A native `disabled` <button> does not reliably suppress drag/drop events across
          // browsers, so this is guarded explicitly rather than relying on the disabled attribute.
          if (!isDisabled) {
            setIsDragging(true)
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          if (!isDisabled) {
            handleFiles(event.dataTransfer.files)
          }
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-input',
          isDisabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
        <span>{isUploading ? 'Uploading…' : 'Click or drag photos here'}</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
        className="hidden"
        data-testid="media-uploader-input"
        disabled={isDisabled}
        onChange={(event) => {
          handleFiles(event.target.files)
          event.target.value = ''
        }}
      />

      {error && (
        <div
          data-testid="media-uploader-error"
          className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Dismiss error">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {assets.length > 0 && (
        <ul data-testid="media-uploader-assets" className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {assets.map((asset, index) => (
            <li
              key={asset.asset_id}
              data-testid="media-uploader-asset"
              className="group relative overflow-hidden rounded-md border border-input"
            >
              {asset.mime_type.startsWith('video/') ? (
                <video
                  src={asset.url}
                  className="h-24 w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img src={asset.url} alt={asset.filename} className="h-24 w-full object-cover" />
              )}

              {asset.is_primary && (
                <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Primary
                </span>
              )}

              {/* group-focus-within keeps controls reachable via keyboard (Tab) even though
                  they're otherwise hover-only — a mouse-only reveal would leave them
                  unreachable without a pointer. */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  type="button"
                  disabled={isDisabled || index === 0}
                  onClick={() => moveAsset(asset.asset_id, 'left')}
                  aria-label="Move left"
                >
                  <ChevronLeft className="h-4 w-4 text-white" />
                </button>
                <button
                  type="button"
                  disabled={isDisabled || asset.is_primary}
                  onClick={() => setPrimaryAsset(asset.asset_id)}
                  aria-label="Set as primary"
                >
                  <Star className={cn('h-4 w-4', asset.is_primary ? 'fill-white text-white' : 'text-white')} />
                </button>
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => removeAsset(asset.asset_id)}
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </button>
                <button
                  type="button"
                  disabled={isDisabled || index === assets.length - 1}
                  onClick={() => moveAsset(asset.asset_id, 'right')}
                  aria-label="Move right"
                >
                  <ChevronRight className="h-4 w-4 text-white" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
