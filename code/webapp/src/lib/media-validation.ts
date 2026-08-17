import type { MediaContext } from '@/types/media'

// Mirrors config('media.contexts') and UploadMediaRequest's 8000 KB cap
// (code/api/config/media.php, code/api/app/Http/Requests/Media/UploadMediaRequest.php)
// for immediate client-side feedback — the backend remains the source of truth, and
// re-validates every upload against the context declared here (or, for a gallery this
// hook is reusing, the context that gallery was actually created with).
export const MEDIA_CONTEXT_EXTENSIONS: Record<MediaContext, readonly string[]> = {
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

/** Value for a file input's `accept` attribute — restricts the OS file picker per context. */
export function mediaContextAccept(context: MediaContext): string {
  return MEDIA_CONTEXT_EXTENSIONS[context].map((extension) => EXTENSION_MIME_TYPES[extension]).join(',')
}

export const MAX_FILE_SIZE_BYTES = 8000 * 1024

// owner_token is a bearer-style credential (see doc/architecture/media/media-architecture.en.md
// §5.1): a predictable fallback would let anyone guess it and claim someone else's in-progress
// gallery, so unlike generateToastId() in components/ui/toast-provider.tsx (a harmless UI id,
// which degrades to a counter), this fails loudly instead of degrading to a weaker token.
export function generateOwnerToken(): string {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new TypeError('A secure random number generator is required to upload media (crypto.randomUUID unavailable).')
  }
  return crypto.randomUUID()
}

function fileExtension(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? ''
}

export function validateFile(file: File, allowedExtensions: readonly string[]): string | null {
  if (!allowedExtensions.includes(fileExtension(file))) {
    return `"${file.name}" is not a supported file type.`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" exceeds the 8000 KB upload limit.`
  }
  return null
}
