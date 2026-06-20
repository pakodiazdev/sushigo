import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Trash2, Plus, X, Check, AlertTriangle } from 'lucide-react'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  useHolidayManagement,
  type HolidayEditValues,
  type HolidayFormValues,
} from './use-holiday-management'
import type { Holiday, HolidayType } from '@/types/attendance-payroll'

export const Route = createFileRoute('/attendance/config/holidays')({
  beforeLoad: requirePermission('holidays.manage'),
  component: HolidaysPage,
})

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const WEEK_LABELS = ['1ª', '2ª', '3ª', '4ª', '5ª']

// ── Helpers ───────────────────────────────────────────────────────────────────

function multiplierLabel(value: number): string {
  if (value === 2) return '2× Doble'
  if (value === 3) return '3× Triple'
  return `${value}×`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeBadge({ type }: Readonly<{ type: HolidayType | null }>) {
  if (!type) return null

  const styles: Record<HolidayType, string> = {
    obligatorio: 'bg-red-100 text-red-700 border-red-200',
    asueto: 'bg-orange-100 text-orange-700 border-orange-200',
    opcional: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  const labels: Record<HolidayType, string> = {
    obligatorio: 'Obligatorio',
    asueto: 'Asueto',
    opcional: 'Opcional',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[type]}`}>
      {labels[type]}
    </span>
  )
}

function OriginChip({ holiday }: Readonly<{ holiday: Holiday }>) {
  if (holiday.is_auto_generated) {
    return (
      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600 border border-blue-100">
        Auto
      </span>
    )
  }
  if (holiday.definition_id !== null) {
    return (
      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-600 border border-amber-100">
        Override
      </span>
    )
  }
  return (
    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-50 text-gray-500 border border-gray-100">
      Manual
    </span>
  )
}

function WarningBanner({
  warnings,
  selectedYear,
}: Readonly<{ warnings: string[]; selectedYear: number }>) {
  if (warnings.length === 0) return null

  return (
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-yellow-800">
          Festividades sin fecha para {selectedYear}:
        </p>
        <ul className="mt-1 text-sm text-yellow-700">
          {warnings.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

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
  onEditSubmit: (values: HolidayEditValues) => void
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
        <td className="px-4 py-2" colSpan={2}>
          <Input type="text" {...register('name')} className="h-8 text-sm" />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </td>
        <td className="px-4 py-2">
          <Input
            type="number"
            step="0.01"
            min="1"
            max="9.99"
            {...register('pay_multiplier', { valueAsNumber: true })}
            className="h-8 text-sm"
          />
          {errors.pay_multiplier && (
            <p className="text-xs text-destructive mt-1">{errors.pay_multiplier.message}</p>
          )}
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
      <td className="px-4 py-2 text-sm">
        <span>{holiday.name}</span>
        <OriginChip holiday={holiday} />
      </td>
      <td className="px-4 py-2">
        <TypeBadge type={holiday.type} />
      </td>
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

function RecurrenceBuilder({
  register,
  watch,
}: Readonly<{
  register: ReturnType<typeof useHolidayManagement>['addForm']['register']
  watch: ReturnType<typeof useHolidayManagement>['addForm']['watch']
}>) {
  const recurrenceType = watch('recurrence_type')

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="add-recurrence-type" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Patrón de recurrencia
        </label>
        <select
          id="add-recurrence-type"
          {...register('recurrence_type')}
          className="mt-1 h-10 w-full border rounded px-2 text-sm bg-background"
        >
          <option value="fixed">Fecha fija (ej. 1 de enero)</option>
          <option value="nth_weekday">Lunes movible (ej. 1er lunes de febrero)</option>
          <option value="floating">Fecha variable (Semana Santa — configurar por año)</option>
        </select>
      </div>

      {recurrenceType === 'fixed' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="add-rec-month" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mes
            </label>
            <select
              id="add-rec-month"
              {...register('recurrence_month', { valueAsNumber: true })}
              className="mt-1 h-10 w-full border rounded px-2 text-sm bg-background"
            >
              <option value="">Seleccionar</option>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="add-rec-day" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Día
            </label>
            <Input
              id="add-rec-day"
              type="number"
              min="1"
              max="31"
              {...register('recurrence_day', { valueAsNumber: true })}
              placeholder="1-31"
              className="mt-1"
            />
          </div>
        </div>
      )}

      {recurrenceType === 'nth_weekday' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="add-rec-week" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Semana
            </label>
            <select
              id="add-rec-week"
              {...register('recurrence_week', { valueAsNumber: true })}
              className="mt-1 h-10 w-full border rounded px-2 text-sm bg-background"
            >
              <option value="">Seleccionar</option>
              {WEEK_LABELS.map((label, i) => (
                <option key={label} value={i + 1}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="add-rec-nth-month" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mes
            </label>
            <select
              id="add-rec-nth-month"
              {...register('recurrence_month', { valueAsNumber: true })}
              className="mt-1 h-10 w-full border rounded px-2 text-sm bg-background"
            >
              <option value="">Seleccionar</option>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">
              El día de la semana es siempre lunes (LFT). El campo weekday se establece automáticamente.
            </p>
          </div>
        </div>
      )}

      {recurrenceType === 'floating' && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
          Las fechas se configurarán manualmente cada año desde el calendario de instancias.
        </p>
      )}
    </div>
  )
}

function AddHolidayForm({
  addForm,
  handleAddSubmit,
  isCreating,
  onCancel,
}: Readonly<{
  addForm: ReturnType<typeof useHolidayManagement>['addForm']
  handleAddSubmit: (values: HolidayFormValues) => void
  isCreating: boolean
  onCancel: () => void
}>) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = addForm

  const type = watch('type')
  const isAnnual = watch('is_annual')

  return (
    <form
      onSubmit={handleSubmit(handleAddSubmit)}
      className="border rounded-lg p-4 space-y-4 bg-card max-w-lg"
    >
      <h3 className="text-sm font-semibold">Nuevo día festivo</h3>

      <div>
        <label htmlFor="add-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Nombre
        </label>
        <Input id="add-name" type="text" {...register('name')} placeholder="Ej. Año Nuevo" className="mt-1" />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="add-description" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Descripción (opcional)
        </label>
        <Input
          id="add-description"
          type="text"
          {...register('description')}
          placeholder="Descripción breve"
          className="mt-1"
        />
      </div>

      <div>
        <label htmlFor="add-type" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Tipo
        </label>
        <select
          id="add-type"
          {...register('type')}
          className="mt-1 h-10 w-full border rounded px-2 text-sm bg-background"
        >
          <option value="obligatorio">Obligatorio (Art. 74 LFT — 3× fijo)</option>
          <option value="asueto">Asueto (empresa/convenio — 2× fijo)</option>
          <option value="opcional">Opcional (discrecional — multiplicador libre)</option>
        </select>
        {errors.type && <p className="text-xs text-destructive mt-1">{errors.type.message}</p>}
      </div>

      {type === 'opcional' && (
        <div>
          <label htmlFor="add-multiplier" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Multiplicador de pago
          </label>
          <Input
            id="add-multiplier"
            type="number"
            step="0.01"
            min="1"
            max="9.99"
            {...register('pay_multiplier', { valueAsNumber: true })}
            placeholder="Ej. 2.0"
            className="mt-1"
          />
          {errors.pay_multiplier && (
            <p className="text-xs text-destructive mt-1">{errors.pay_multiplier.message}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <label htmlFor="add-is-annual" className="text-sm font-medium cursor-pointer">
          ¿Se repite cada año?
        </label>
        <input
          id="add-is-annual"
          type="checkbox"
          {...register('is_annual')}
          className="h-4 w-4 rounded border-gray-300"
        />
      </div>

      {isAnnual ? (
        <RecurrenceBuilder register={register} watch={watch} />
      ) : (
        <div>
          <label htmlFor="add-date" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Fecha
          </label>
          <Input id="add-date" type="date" {...register('date')} className="mt-1" />
          {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isCreating}>
          {isCreating ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function HolidaysPage() {
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR)

  const {
    holidays,
    isLoading,
    warnings,
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

      {/* Warning banner for floating holidays without date */}
      <WarningBanner warnings={warnings} selectedYear={selectedYear} />

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
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Multiplicador</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
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
        <AddHolidayForm
          addForm={addForm}
          handleAddSubmit={handleAddSubmit}
          isCreating={isCreating}
          onCancel={() => setShowAddForm(false)}
        />
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
