import { useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth.store'
import { todayDateCdmx } from '@/lib/datetime'
import { useBusinessDate } from '@/stores/clock.store'

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
  const businessDate = useBusinessDate()
  // Computed at mount time — fresh per form instance, never stale across midnight.
  const today = useMemo(() => businessDate ?? todayDateCdmx(), [businessDate])
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

  // `today` can change after mount (businessDate resolves asynchronously,
  // later than the browser-clock fallback used for the initial defaultValues)
  // — keep start_date in sync while the user hasn't touched it, so an
  // untouched field never ends up failing the "not in the future" check it
  // was pre-filled to satisfy.
  useEffect(() => {
    if (!form.getFieldState('start_date').isDirty) {
      form.setValue('start_date', today)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today])

  return { form, today, effectiveBranch }
}
