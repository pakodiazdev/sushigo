import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useOvertimeConfig, useSetOvertimeConfig } from '@/services/overtime-hooks'

const setConfigSchema = z
  .object({
    valuation_method: z.enum(['LFT_PROPORTIONAL', 'AGREED_RATE'], {
      message: 'Selecciona un método de valoración',
    }),
    lft_factor: z.string().optional(),
    hourly_rate: z.string().optional(),
    effective_from: z.string().min(1, 'La fecha de vigencia es requerida'),
  })
  .refine(
    (data) => data.valuation_method !== 'LFT_PROPORTIONAL' || Number(data.lft_factor) > 0,
    { message: 'El factor LFT es requerido', path: ['lft_factor'] },
  )
  .refine(
    (data) => data.valuation_method !== 'AGREED_RATE' || Number(data.hourly_rate) > 0,
    { message: 'La tarifa por hora es requerida', path: ['hourly_rate'] },
  )

export type SetConfigFormValues = z.infer<typeof setConfigSchema>

export function useOvertimeConfigSection(employeeId: string) {
  const [showForm, setShowForm] = useState(false)

  const { data: configs, isLoading: isLoadingConfigs } = useOvertimeConfig(employeeId)
  const setConfig = useSetOvertimeConfig(employeeId)

  const form = useForm<SetConfigFormValues>({
    resolver: zodResolver(setConfigSchema),
    defaultValues: { valuation_method: 'LFT_PROPORTIONAL', lft_factor: '', hourly_rate: '', effective_from: '' },
  })

  const today = new Date().toISOString().slice(0, 10)
  const current =
    configs?.find(
      (c) => c.effective_from <= today && (c.effective_to === null || c.effective_to >= today),
    ) ?? null

  const onSubmit: SubmitHandler<SetConfigFormValues> = (values) => {
    setConfig.mutate(
      {
        valuation_method: values.valuation_method,
        lft_factor: values.valuation_method === 'LFT_PROPORTIONAL' ? Number(values.lft_factor) : undefined,
        hourly_rate: values.valuation_method === 'AGREED_RATE' ? Number(values.hourly_rate) : undefined,
        effective_from: values.effective_from,
      },
      {
        onSuccess: () => {
          setShowForm(false)
          form.reset()
        },
      },
    )
  }

  return {
    current,
    configs,
    isLoadingConfigs,
    showForm,
    setShowForm,
    form,
    onSubmit,
    isPending: setConfig.isPending,
  }
}
