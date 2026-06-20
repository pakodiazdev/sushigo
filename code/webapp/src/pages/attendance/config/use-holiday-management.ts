import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useDeleteHoliday,
  useHolidays,
  useUpdateHoliday,
} from '@/services/holiday-hooks'
import { useCreateHolidayDefinition } from '@/services/holiday-definition-hooks'
import type { Holiday, RecurrenceConfig } from '@/types/attendance-payroll'

// ── Schemas ───────────────────────────────────────────────────────────────────

export const holidayFormSchema = z
  .object({
    name: z.string().min(1, 'El nombre es requerido').max(255),
    description: z.string().max(500).optional(),
    type: z.enum(['obligatorio', 'asueto', 'opcional']),
    pay_multiplier: z.number().min(1).max(9.99).optional(),
    is_annual: z.boolean(),
    recurrence_type: z.enum(['fixed', 'nth_weekday', 'floating', 'none']),
    recurrence_month: z.number().min(1).max(12).optional(),
    recurrence_day: z.number().min(1).max(31).optional(),
    recurrence_week: z.number().min(1).max(5).optional(),
    recurrence_weekday: z.number().min(1).max(7).optional(),
    date: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'opcional' && !data.pay_multiplier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El multiplicador es requerido para tipo opcional',
        path: ['pay_multiplier'],
      })
    }
    if (data.is_annual && data.recurrence_type === 'fixed') {
      if (!data.recurrence_month) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El mes es requerido',
          path: ['recurrence_month'],
        })
      }
      if (!data.recurrence_day) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El día es requerido',
          path: ['recurrence_day'],
        })
      }
    }
    if (data.is_annual && data.recurrence_type === 'nth_weekday') {
      if (!data.recurrence_month) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El mes es requerido',
          path: ['recurrence_month'],
        })
      }
      if (!data.recurrence_week) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La semana es requerida',
          path: ['recurrence_week'],
        })
      }
      if (!data.recurrence_weekday) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El día de la semana es requerido',
          path: ['recurrence_weekday'],
        })
      }
    }
    if (!data.is_annual || data.recurrence_type === 'none') {
      if (!data.date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La fecha es requerida',
          path: ['date'],
        })
      }
    }
  })

export type HolidayFormValues = z.infer<typeof holidayFormSchema>

// Edit form for holiday instances keeps the original simpler schema
export const holidayEditSchema = z.object({
  date: z.string().min(1, 'La fecha es requerida').regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  name: z.string().min(1, 'El nombre es requerido').max(255),
  pay_multiplier: z.number().min(1).max(9.99),
})

export type HolidayEditValues = z.infer<typeof holidayEditSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildRecurrenceConfig(values: HolidayFormValues): RecurrenceConfig {
  if (values.recurrence_type === 'fixed') {
    return { month: values.recurrence_month ?? 1, day: values.recurrence_day ?? 1 }
  }
  if (values.recurrence_type === 'nth_weekday') {
    return {
      month: values.recurrence_month ?? 1,
      week: values.recurrence_week ?? 1,
      weekday: values.recurrence_weekday ?? 1,
    }
  }
  return {}
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useHolidayManagement(year?: number) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const { data: holidays, isLoading, warnings } = useHolidays(year)
  const createDefinition = useCreateHolidayDefinition()
  const updateHoliday = useUpdateHoliday()
  const deleteHoliday = useDeleteHoliday()

  // ── Add form (definition-based) ───────────────────────────────────────────

  const addForm = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'obligatorio',
      pay_multiplier: undefined,
      is_annual: true,
      recurrence_type: 'fixed',
      recurrence_month: undefined,
      recurrence_day: undefined,
      recurrence_week: undefined,
      recurrence_weekday: undefined,
      date: '',
    },
  })

  const handleAddSubmit = async (values: HolidayFormValues) => {
    await createDefinition.mutateAsync({
      name: values.name,
      description: values.description,
      type: values.type,
      pay_multiplier: values.type === 'opcional' ? values.pay_multiplier : undefined,
      is_annual: values.is_annual,
      recurrence_type: values.recurrence_type,
      recurrence_config: buildRecurrenceConfig(values),
      date: !values.is_annual || values.recurrence_type === 'none' ? values.date : undefined,
    })
    addForm.reset()
    setShowAddForm(false)
  }

  // ── Edit form (instance override) ─────────────────────────────────────────

  const editForm = useForm<HolidayEditValues>({
    resolver: zodResolver(holidayEditSchema),
    defaultValues: { date: '', name: '', pay_multiplier: 2 },
  })

  const startEdit = (holiday: Holiday) => {
    setEditingId(holiday.id)
    editForm.reset({
      date: holiday.date,
      name: holiday.name,
      pay_multiplier: holiday.pay_multiplier,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    editForm.reset()
  }

  const handleEditSubmit = async (values: HolidayEditValues) => {
    if (editingId === null) return
    await updateHoliday.mutateAsync({ id: editingId, payload: values })
    setEditingId(null)
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (confirmDeleteId === null) return
    await deleteHoliday.mutateAsync(confirmDeleteId)
    setConfirmDeleteId(null)
  }

  return {
    // Data
    holidays: holidays ?? [],
    isLoading,
    warnings,
    // Add form
    showAddForm,
    setShowAddForm,
    addForm,
    handleAddSubmit,
    isCreating: createDefinition.isPending,
    // Edit
    editingId,
    startEdit,
    cancelEdit,
    editForm,
    handleEditSubmit,
    isUpdating: updateHoliday.isPending,
    // Delete
    confirmDeleteId,
    setConfirmDeleteId,
    handleDeleteConfirm,
    isDeleting: deleteHoliday.isPending,
  }
}
