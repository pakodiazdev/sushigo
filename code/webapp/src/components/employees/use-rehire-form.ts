import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth.store'

// ─── Schema factory ───────────────────────────────────────────────────────────
// Built at call time so `today` is always the current date, even if the app
// stays open past midnight.

function buildRehireSchema(today: string) {
  return z.object({
    start_date: z
      .string()
      .min(1, 'La fecha de reingreso es requerida')
      .refine((v) => v <= today, 'La fecha de reingreso no puede ser futura'),
  })
}

export type RehireFormValues = z.infer<ReturnType<typeof buildRehireSchema>>

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Encapsulates schema creation, form registration, and branch resolution for
 * the RehireForm.
 *
 * Branch resolution (currentBranch ?? first available) lives here rather than
 * in the view so it can be tested independently of the rendering layer.
 */
export function useRehireForm() {
  // Computed at mount time — fresh per form instance, never stale across midnight.
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const schema = useMemo(() => buildRehireSchema(today), [today])

  // Use currentBranch or fall back to the first (and only) available branch.
  const currentBranch = useAuthStore((s) => s.currentBranch)
  const availableBranches = useAuthStore((s) => s.availableBranches)
  const effectiveBranch = currentBranch ?? availableBranches[0] ?? null

  const form = useForm<RehireFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      start_date: today,
    },
  })

  return { form, today, effectiveBranch }
}
