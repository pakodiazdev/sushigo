import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface AvatarProps {
  /** Full display name — source of the accessible label and the initials fallback. */
  name: string
  /** Primary avatar photo URL, or null/undefined when the user has none. */
  imageUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
}

// Deterministic per-name palette: same name always picks the same color, distinct
// names spread across the set — never fed through Math.random, so server- and
// client-rendered output (and the same user across sessions) always match.
const PALETTE = [
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
]

/** Simple deterministic string hash (djb2) — stable across renders/sessions, not cryptographic. */
function hashString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ (value.codePointAt(i) ?? 0)
  }
  return Math.abs(hash)
}

/** First letter of the first word + first letter of the last word; single word uses its first two letters. */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase()
}

function paletteClassesFor(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return PALETTE[0]!
  return PALETTE[hashString(trimmed) % PALETTE.length]!
}

/**
 * Displays a user's avatar photo, falling back to a deterministic
 * initials badge — same name always renders the same initials and color —
 * whenever there's no image, or the image fails to load.
 */
export function Avatar({ name, imageUrl, size = 'md', className }: Readonly<AvatarProps>) {
  const [imageFailed, setImageFailed] = useState(false)

  // A new imageUrl (e.g. after replacing the photo) deserves a fresh attempt,
  // not a stale "this URL already failed" from a previous avatar.
  useEffect(() => {
    setImageFailed(false)
  }, [imageUrl])

  const showImage = !!imageUrl && !imageFailed

  return (
    <div
      role="img"
      aria-label={name || 'Usuario'}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold',
        SIZE_CLASSES[size],
        !showImage && paletteClassesFor(name),
        className
      )}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </div>
  )
}
