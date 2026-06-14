import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useCreateHoliday,
  useDeleteHoliday,
  useHolidays,
  useUpdateHoliday,
} from '@/services/holiday-hooks'
import type { Holiday } from '@/types/attendance-payroll'

// ── Schemas ───────────────────────────────────────────────────────────────────

export const holidayFormSchema = z.object({
  date: z.string().min(1, 'La fecha es requerida').regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  name: z.string().min(1, 'El nombre es requerido').max(255),
  pay_multiplier: z.number().min(1).max(9.99),
})

export type HolidayFormValues = z.infer<typeof holidayFormSchema>

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useHolidayManagement(year?: number) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const { data: holidays, isLoading } = useHolidays(year)
  const createHoliday = useCreateHoliday()
  const updateHoliday = useUpdateHoliday()
  const deleteHoliday = useDeleteHoliday()

  // ── Add form ──────────────────────────────────────────────────────────────

  const addForm = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      date: '',
      name: '',
      pay_multiplier: 2,
    },
  })

  const handleAddSubmit = async (values: HolidayFormValues) => {
    await createHoliday.mutateAsync(values)
    addForm.reset()
    setShowAddForm(false)
  }

  // ── Edit form ─────────────────────────────────────────────────────────────

  const editForm = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
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

  const handleEditSubmit = async (values: HolidayFormValues) => {
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
    // Add form
    showAddForm,
    setShowAddForm,
    addForm,
    handleAddSubmit,
    isCreating: createHoliday.isPending,
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
