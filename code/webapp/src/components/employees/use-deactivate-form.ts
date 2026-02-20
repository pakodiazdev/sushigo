import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

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
  // Computed at mount time — fresh per form instance, never stale across midnight.
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const schema = useMemo(() => buildDeactivateSchema(today), [today])

  const form = useForm<DeactivateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      end_date: today,
      termination_reason: '',
    },
  })

  return { form, today }
}
