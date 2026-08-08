import { useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { todayDateCdmx } from '@/lib/datetime'
import { useBusinessDate } from '@/stores/clock.store'

// ─── Schema factory ───────────────────────────────────────────────────────────
// Built at call time so `today` is always the current date, even if the app
// stays open past midnight.

function buildDeactivateSchema(today: string) {
  return z.object({
    end_date: z
      .string()
      .min(1, 'La fecha de baja es requerida')
      .refine((v) => v <= today, 'La fecha de baja no puede ser futura'),
    termination_reason: z.string().max(500).optional(),
  })
}

export type DeactivateFormValues = z.infer<ReturnType<typeof buildDeactivateSchema>>

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Encapsulates schema creation and form registration for the DeactivateForm.
 *
 * Separating the hook from the view means the schema and default values can be
 * unit-tested without rendering any UI.
 */
export function useDeactivateForm() {
  const businessDate = useBusinessDate()
  // Computed at mount time — fresh per form instance, never stale across midnight.
  const today = useMemo(() => businessDate ?? todayDateCdmx(), [businessDate])
  const schema = useMemo(() => buildDeactivateSchema(today), [today])

  const form = useForm<DeactivateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      end_date: today,
      termination_reason: '',
    },
  })

  // `today` can change after mount (businessDate resolves asynchronously,
  // later than the browser-clock fallback used for the initial defaultValues)
  // — keep end_date in sync while the user hasn't touched it, so an untouched
  // field never ends up failing the "not in the future" check it was
  // pre-filled to satisfy.
  useEffect(() => {
    if (!form.getFieldState('end_date').isDirty) {
      form.setValue('end_date', today)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today])

  return { form, today }
}
