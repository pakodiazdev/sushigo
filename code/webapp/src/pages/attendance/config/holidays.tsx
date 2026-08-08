import { useState, useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Trash2, Plus, AlertTriangle } from 'lucide-react'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SlidePanel } from '@/components/ui/slide-panel'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { Label } from '@/components/ui/label'
import {
  useHolidayManagement,
  type HolidayEditValues,
  type HolidayFormValues,
} from './use-holiday-management'
import type { Holiday, HolidayType } from '@/types/attendance-payroll'
import { todayDateCdmx } from '@/lib/datetime'
import { useBusinessDate } from '@/stores/clock.store'

export const Route = createFileRoute('/attendance/config/holidays')({
  beforeLoad: requirePermission('holidays.manage'),
  component: HolidaysPage,
})

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const WEEK_LABELS = ['1ª', '2ª', '3ª', '4ª', '5ª']

// ── Helpers ───────────────────────────────────────────────────────────────────

function multiplierLabel(value: number): string {
  if (value < 1) return `${value}× Parcial`
  if (value === 1) return '1× Normal'
  if (value === 2) return '2× Doble'
  if (value === 3) return '3× Triple'
  return `${value}×`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeBadge({ type }: Readonly<{ type: HolidayType | null }>) {
  if (!type) return null

  const styles: Record<HolidayType, string> = {
    obligatorio: 'bg-red-50 text-red-700 border-red-100',
    asueto: 'bg-blue-50 text-blue-700 border-blue-100',
    opcional: 'bg-purple-50 text-purple-700 border-purple-100',
  }

  const labels: Record<HolidayType, string> = {
    obligatorio: 'Obligatorio',
    asueto: 'Asueto',
    opcional: 'Opcional',
  }

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs border ${styles[type]}`}>
      {labels[type]}
    </span>
  )
}

function OriginChip({ holiday }: Readonly<{ holiday: Holiday }>) {
  if (holiday.is_auto_generated) {
    return (
      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-50 text-green-600 border border-green-100">
        Auto
      </span>
    )
  }
  if (holiday.definition_id !== null) {
    return (
      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-yellow-50 text-yellow-600 border border-yellow-100">
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
          Estos tipos de festivo no tienen fecha calculable para {selectedYear} — usa "Nuevo tipo de festivo" con fecha específica para registrar cada instancia:
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
          <option value="easter_offset">Relativo a Pascua (Semana Santa — automático)</option>
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
              {...register('recurrence_month', { setValueAs: (v: string) => (v === '' || v === undefined) ? undefined : Number(v) })}
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
              {...register('recurrence_day', { setValueAs: (v: string) => (v === '' || v === undefined) ? undefined : Number(v) })}
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
              {...register('recurrence_week', { setValueAs: (v: string) => (v === '' || v === undefined) ? undefined : Number(v) })}
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
              {...register('recurrence_month', { setValueAs: (v: string) => (v === '' || v === undefined) ? undefined : Number(v) })}
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

      {recurrenceType === 'easter_offset' && (
        <div>
          <label htmlFor="add-rec-offset" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Días desde Pascua (negativo = antes)
          </label>
          <Input
            id="add-rec-offset"
            type="number"
            min="-7"
            max="7"
            {...register('recurrence_offset', { setValueAs: (v: string) => (v === '' || v === undefined) ? undefined : Number(v) })}
            placeholder="ej. -2 para Viernes Santo"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Pascua 2026: 5 de abril · −3 Jueves Santo · −2 Viernes Santo · −1 Sábado Santo
          </p>
        </div>
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
      className="space-y-5"
    >
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
          <option value="obligatorio">Obligatorio — 3× fijo (LFT Art. 74)</option>
          <option value="asueto">Asueto — 1× normal (empresa / convenio colectivo)</option>
          <option value="opcional">Opcional — multiplicador libre (negociación extra)</option>
        </select>
        {errors.type && <p className="text-xs text-destructive mt-1">{errors.type.message}</p>}

        {type === 'obligatorio' && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            La LFT Art. 74 exige 3× de pago si el trabajador labora este día (salario doble + el día ordinario). No negociable.
          </p>
        )}
        {type === 'asueto' && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Día libre otorgado por la empresa o convenio colectivo. Si el trabajador labora, cobra su jornada normal (1×) — el beneficio es el descanso, no un premium.
          </p>
        )}
        {type === 'opcional' && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Para negociaciones específicas o acuerdos excepcionales. Define el multiplicador según lo pactado; el valor habitual es 1×.
          </p>
        )}
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
            min="0.01"
            max="9.99"
            {...register('pay_multiplier', { setValueAs: (v: string) => (v === '' || v === undefined) ? undefined : Number(v) })}
            placeholder="1.0"
            className="mt-1"
          />
          {errors.pay_multiplier && (
            <p className="text-xs text-destructive mt-1">{errors.pay_multiplier.message}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Label htmlFor="add-is-annual" className="cursor-pointer">
          ¿Se repite cada año?
        </Label>
        <input
          id="add-is-annual"
          type="checkbox"
          {...register('is_annual')}
          className="h-4 w-4 rounded border-gray-300"
        />
      </div>

      {isAnnual && <RecurrenceBuilder register={register} watch={watch} />}

      {/* Always mounted so react-hook-form keeps the ref; hidden via CSS when is_annual */}
      <div className={isAnnual ? 'hidden' : ''}>
        <label htmlFor="add-date" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Fecha
        </label>
        <Input
          id="add-date"
          type="text"
          placeholder="YYYY-MM-DD"
          {...register('date')}
          className="mt-1"
        />
        {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
      </div>

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

function EditHolidayForm({
  editForm,
  onSubmit,
  isUpdating,
  onCancel,
}: Readonly<{
  editForm: ReturnType<typeof useHolidayManagement>['editForm']
  onSubmit: (values: HolidayEditValues) => void
  isUpdating: boolean
  onCancel: () => void
}>) {
  const { register, handleSubmit, formState: { errors } } = editForm

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label htmlFor="edit-date" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Fecha
        </label>
        <Input id="edit-date" type="date" {...register('date')} className="mt-1" />
        {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
      </div>

      <div>
        <label htmlFor="edit-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Nombre
        </label>
        <Input id="edit-name" type="text" {...register('name')} className="mt-1" />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="edit-pay-multiplier" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Multiplicador de pago
        </label>
        <Input
          id="edit-pay-multiplier"
          type="number"
          step="0.01"
          min="0.01"
          max="9.99"
          {...register('pay_multiplier', { setValueAs: (v: string) => (v === '' || v === undefined) ? undefined : Number(v) })}
          className="mt-1"
        />
        {errors.pay_multiplier && (
          <p className="text-xs text-destructive mt-1">{errors.pay_multiplier.message}</p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" title="Guardar" disabled={isUpdating}>
          {isUpdating ? 'Guardando...' : 'Guardar'}
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
  const businessDate = useBusinessDate()
  const currentYear = Number((businessDate ?? todayDateCdmx()).slice(0, 4))
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)

  // businessDate resolves asynchronously (after login) and can land on a
  // different year than the browser-clock fallback used for the very first
  // render, leaving selectedYear pointing outside the recomputed yearOptions.
  // Re-sync only when selectedYear still equals the last value *we* set it
  // to — if the user picked a year themselves (via the <select> below) in
  // the meantime, selectedYear no longer matches and this leaves it alone,
  // even across later clock changes (e.g. the devtools clock simulator).
  const lastAutoYearRef = useRef(currentYear)
  useEffect(() => {
    if (selectedYear === lastAutoYearRef.current && currentYear !== lastAutoYearRef.current) {
      setSelectedYear(currentYear)
    }
    lastAutoYearRef.current = currentYear
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear])

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

  const columns: Column<Holiday>[] = [
    {
      key: 'date',
      header: 'Fecha',
      width: '130px',
      render: (h) => h.date,
    },
    {
      key: 'name',
      header: 'Nombre',
      render: (h) => (
        <span className="inline-flex items-center gap-1.5">
          {h.name}
          <OriginChip holiday={h} />
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      width: '120px',
      render: (h) => <TypeBadge type={h.type} />,
    },
    {
      key: 'pay_multiplier',
      header: 'Multiplicador',
      width: '130px',
      render: (h) => multiplierLabel(h.pay_multiplier),
    },
    {
      key: 'actions',
      header: '',
      width: '90px',
      align: 'right',
      render: (h) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => startEdit(h)}
            title="Editar festivo"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setConfirmDeleteId(h.id)}
            title="Eliminar festivo"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Días Festivos"
        description="Administra el catálogo de días festivos y su multiplicador de pago."
      />

      <div className="mt-6 space-y-4">
        {/* Toolbar: year filter + action */}
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="year-select" className="text-sm font-medium text-muted-foreground">
            Año:
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border rounded px-3 py-1.5 text-sm bg-background"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className="flex-1" />
          <Button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo tipo de festivo
          </Button>
        </div>

        <WarningBanner warnings={warnings} selectedYear={selectedYear} />

        <DataGrid
          data={holidays}
          columns={columns}
          loading={isLoading}
          emptyMessage={`No hay días festivos registrados para ${selectedYear}.`}
          getRowId={(h) => h.id}
        />
      </div>

      {/* Add holiday slide panel */}
      <SlidePanel
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="Nuevo tipo de festivo"
        description="Define la plantilla. Las instancias se calculan automáticamente para cada año a partir del año en curso."
        size="sm"
      >
        <AddHolidayForm
          addForm={addForm}
          handleAddSubmit={handleAddSubmit}
          isCreating={isCreating}
          onCancel={() => setShowAddForm(false)}
        />
      </SlidePanel>

      {/* Edit holiday slide panel */}
      <SlidePanel
        isOpen={editingId !== null}
        onClose={cancelEdit}
        title="Editar festivo"
        description="Modifica la fecha, nombre o multiplicador de esta instancia."
        size="sm"
      >
        <EditHolidayForm
          editForm={editForm}
          onSubmit={handleEditSubmit}
          isUpdating={isUpdating}
          onCancel={cancelEdit}
        />
      </SlidePanel>

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
