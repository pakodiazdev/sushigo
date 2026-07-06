import { useEffect } from 'react'
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useOvertimeLftTiers, useUpdateOvertimeLftTiers } from '@/services/overtime-lft-tiers-hooks'

// up_to_hours is kept as a plain string in the form ('' = unbounded/last tier)
// and only converted to number|null when building the API payload — avoids
// storing `null` in a react-hook-form number field, which mishandles reset/DOM sync.
const rowSchema = z.object({
  factor: z.number().positive(),
  up_to_hours: z.string(),
})

export const tiersSchema = z
  .object({ rows: z.array(rowSchema).min(1) })
  .superRefine(({ rows }, ctx) => {
    rows.forEach((row, i) => {
      const isLast = i === rows.length - 1

      if (row.up_to_hours === '') {
        if (!isLast) {
          ctx.addIssue({
            code: 'custom',
            path: ['rows', i, 'up_to_hours'],
            message: 'Solo el último tramo puede no tener tope',
          })
        }
        return
      }

      const hours = Number(row.up_to_hours)
      if (!Number.isFinite(hours) || hours <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', i, 'up_to_hours'],
          message: 'Debe ser un número mayor que 0',
        })
        return
      }

      const previous = rows[i - 1]
      const previousHours = previous?.up_to_hours !== '' ? Number(previous?.up_to_hours) : null
      if (i > 0 && previousHours !== null && hours <= previousHours) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', i, 'up_to_hours'],
          message: 'Debe ser mayor que el tramo anterior',
        })
      }
    })
  })

export type TiersFormValues = z.infer<typeof tiersSchema>

export function useOvertimeLftTiersConfigPage() {
  const { data: tiers, isLoading } = useOvertimeLftTiers()
  const update = useUpdateOvertimeLftTiers()

  const form = useForm<TiersFormValues>({
    resolver: zodResolver(tiersSchema),
    defaultValues: { rows: [{ factor: 2, up_to_hours: '' }] },
  })

  const { reset } = form
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'rows' })

  useEffect(() => {
    if (tiers) {
      reset({
        rows: tiers.map((t) => ({
          factor: t.factor,
          up_to_hours: t.up_to_hours === null ? '' : String(t.up_to_hours),
        })),
      })
    }
  }, [tiers, reset])

  const onSubmit: SubmitHandler<TiersFormValues> = (values) => {
    update.mutate({
      tiers: values.rows.map((row) => ({
        factor: row.factor,
        up_to_hours: row.up_to_hours === '' ? null : Number(row.up_to_hours),
      })),
    })
  }

  const addRow = () => {
    const lastIndex = fields.length - 1
    const lastUpToHours = form.getValues(`rows.${lastIndex}.up_to_hours`)
    if (lastUpToHours === '') {
      form.setValue(`rows.${lastIndex}.up_to_hours`, '9')
    }
    append({ factor: 3, up_to_hours: '' })
  }

  return {
    tiers,
    isLoading,
    form,
    fields,
    remove,
    onSubmit,
    addRow,
    isPending: update.isPending,
  }
}
