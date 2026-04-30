import { useEffect } from 'react'
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePunctualityRanges, useUpdatePunctualityRanges } from '@/services/punctuality-config-hooks'

const rowSchema = z.object({
  threshold_minutes: z.number().int().min(0),
  bonus_percentage: z.number().min(0).max(100),
})

export const rangesSchema = z
  .object({ rows: z.array(rowSchema).min(1) })
  .superRefine(({ rows }, ctx) => {
    if (rows[0]?.threshold_minutes !== 0) {
      ctx.addIssue({ code: 'custom', path: ['rows', 0, 'threshold_minutes'], message: 'Debe ser 0' })
    }
    rows.forEach((row, i) => {
      if (i > 0 && row.threshold_minutes <= rows[i - 1]!.threshold_minutes) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', i, 'threshold_minutes'],
          message: 'Debe ser mayor que el nivel anterior',
        })
      }
    })
  })

export type RangesFormValues = z.infer<typeof rangesSchema>

export function usePunctualityConfigPage() {
  const { data: ranges, isLoading } = usePunctualityRanges()
  const update = useUpdatePunctualityRanges()

  const form = useForm<RangesFormValues>({
    resolver: zodResolver(rangesSchema),
    defaultValues: { rows: [{ threshold_minutes: 0, bonus_percentage: 100 }] },
  })

  const { reset } = form
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'rows' })

  useEffect(() => {
    if (ranges) {
      reset({
        rows: ranges.map((r) => ({
          threshold_minutes: Math.floor(r.min_seconds / 60),
          bonus_percentage: r.bonus_percentage,
        })),
      })
    }
  }, [ranges, reset])

  const onSubmit: SubmitHandler<RangesFormValues> = (values) => {
    update.mutate({
      ranges: values.rows.map((row) => ({
        min_seconds: row.threshold_minutes * 60,
        bonus_percentage: row.bonus_percentage,
      })),
    })
  }

  const addRow = () => {
    const lastMinutes = form.watch(`rows.${fields.length - 1}.threshold_minutes`) ?? 0
    append({ threshold_minutes: lastMinutes + 10, bonus_percentage: 0 })
  }

  return {
    ranges,
    isLoading,
    form,
    fields,
    remove,
    onSubmit,
    addRow,
    isPending: update.isPending,
  }
}
