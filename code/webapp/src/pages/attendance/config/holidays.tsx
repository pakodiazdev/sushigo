import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useHolidayManagement, type HolidayFormValues } from './use-holiday-management'
import type { Holiday } from '@/types/attendance-payroll'

export const Route = createFileRoute('/attendance/config/holidays')({
  beforeLoad: requirePermission('holidays.manage'),
  component: HolidaysPage,
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const MULTIPLIER_OPTIONS = [
  { value: 2, label: '2× Doble' },
  { value: 3, label: '3× Triple' },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

function multiplierLabel(value: number): string {
  const opt = MULTIPLIER_OPTIONS.find((o) => o.value === value)
  return opt?.label ?? `${value}×`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HolidayRow({
  holiday,
  isEditing,
  editForm,
  onStartEdit,
  onCancelEdit,
  onEditSubmit,
  isUpdating,
  onDeleteClick,
}: Readonly<{
  holiday: Holiday
  isEditing: boolean
  editForm: ReturnType<typeof useHolidayManagement>['editForm']
  onStartEdit: (h: Holiday) => void
  onCancelEdit: () => void
  onEditSubmit: (values: HolidayFormValues) => void
  isUpdating: boolean
  onDeleteClick: (id: number) => void
}>) {
  const { register, handleSubmit, formState: { errors } } = editForm

  if (isEditing) {
    return (
      <tr className="border-t bg-muted/30">
        <td className="px-4 py-2">
          <Input type="date" {...register('date')} className="h-8 text-sm" />
          {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
        </td>
        <td className="px-4 py-2">
          <Input type="text" {...register('name')} className="h-8 text-sm" />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </td>
        <td className="px-4 py-2">
          <select
            {...register('pay_multiplier', { valueAsNumber: true })}
            className="h-8 text-sm border rounded px-2 bg-background"
          >
            {MULTIPLIER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-2 text-right">
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleSubmit(onEditSubmit)}
              disabled={isUpdating}
              title="Guardar"
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onCancelEdit}
              title="Cancelar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t">
      <td className="px-4 py-2 text-sm">{holiday.date}</td>
      <td className="px-4 py-2 text-sm">{holiday.name}</td>
      <td className="px-4 py-2 text-sm">{multiplierLabel(holiday.pay_multiplier)}</td>
      <td className="px-4 py-2 text-right">
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onStartEdit(holiday)}
            title="Editar festivo"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onDeleteClick(holiday.id)}
            title="Eliminar festivo"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function HolidaysPage() {
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR)

  const {
    holidays,
    isLoading,
    showAddForm,
    setShowAddForm,
    addForm,
    handleAddSubmit,
    isCreating,
    editingId,
    startEdit,
    cancelEdit,
    editForm,
    handleEditSubmit,
    isUpdating,
    confirmDeleteId,
    setConfirmDeleteId,
    handleDeleteConfirm,
    isDeleting,
  } = useHolidayManagement(selectedYear)

  const {
    register: registerAdd,
    handleSubmit: handleAddFormSubmit,
    formState: { errors: addErrors },
  } = addForm

  return (
    <PageContainer>
      <PageHeader
        title="Días Festivos"
        description="Administra el catálogo de días festivos y su multiplicador de pago."
      />

      {/* Year selector */}
      <div className="flex items-center gap-3 mb-6">
        <label htmlFor="year-select" className="text-sm font-medium text-muted-foreground">
          Año:
        </label>
        <select
          id="year-select"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border rounded px-3 py-1.5 text-sm bg-background"
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Holidays table */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando días festivos...</p>
      ) : (
        <div className="border rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Multiplicador</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    No hay días festivos registrados para {selectedYear}.
                  </td>
                </tr>
              ) : (
                holidays.map((holiday) => (
                  <HolidayRow
                    key={holiday.id}
                    holiday={holiday}
                    isEditing={editingId === holiday.id}
                    editForm={editForm}
                    onStartEdit={startEdit}
                    onCancelEdit={cancelEdit}
                    onEditSubmit={handleEditSubmit}
                    isUpdating={isUpdating}
                    onDeleteClick={setConfirmDeleteId}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add holiday form */}
      {showAddForm ? (
        <form
          onSubmit={handleAddFormSubmit(handleAddSubmit)}
          className="border rounded-lg p-4 space-y-3 bg-card max-w-lg"
        >
          <h3 className="text-sm font-semibold">Nuevo día festivo</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-date" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Fecha
              </label>
              <Input id="add-date" type="date" {...registerAdd('date')} className="mt-1" />
              {addErrors.date && (
                <p className="text-xs text-destructive mt-1">{addErrors.date.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="add-multiplier" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Multiplicador
              </label>
              <select
                id="add-multiplier"
                {...registerAdd('pay_multiplier', { valueAsNumber: true })}
                className="mt-1 h-10 w-full border rounded px-2 text-sm bg-background"
              >
                {MULTIPLIER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="add-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nombre
            </label>
            <Input id="add-name" type="text" {...registerAdd('name')} placeholder="Ej. Año Nuevo" className="mt-1" />
            {addErrors.name && (
              <p className="text-xs text-destructive mt-1">{addErrors.name.message}</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={isCreating}>
              {isCreating ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar festivo
        </Button>
      )}

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar día festivo"
        description="¿Estás seguro de que deseas eliminar este día festivo? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={isDeleting}
        container="viewport"
      />
    </PageContainer>
  )
}
