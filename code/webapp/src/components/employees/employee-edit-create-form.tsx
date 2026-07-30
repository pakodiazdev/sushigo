import { useMemo, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-fields'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import { EMPLOYEE_POSITION_ROLES } from '@/types/employee'
import type { Employee, EmployeePositionRole } from '@/types/employee'
import { Loader2, RefreshCw } from 'lucide-react'

// ─── Schema ────────────────────────────────────────────────────────────────────
// A single schema shape covers both create and edit modes.
// `mode` is included in the schema so refine() can apply conditional rules.
// Schema is rebuilt when assignable roles change (dynamic enum validation).

function buildSchema(assignableRoles: string[]) {
  const roleEnum =
    assignableRoles.length > 0
      ? z.enum(assignableRoles as [string, ...string[]])
      : z.string()

  return z
    .object({
      mode: z.enum(['create', 'edit']),
      // ── create-only fields ──────────────────────────────────────────────────
      code: z.string().max(20).optional(),
      start_date: z.string().optional(),
      // ── shared fields ───────────────────────────────────────────────────────
      first_name: z.string().min(1, 'El nombre es requerido').max(100),
      last_name: z.string().min(1, 'El apellido es requerido').max(100),
      roles: z.array(roleEnum).min(1, 'Selecciona al menos un puesto'),
      email: z.string().max(255).optional(),
      phone: z.string().max(10).optional(),
      attendance_exempt: z.boolean(),
      // ── context flags (not submitted, used for conditional validation) ───────
      canEditContact: z.boolean(),
      // hasBranch reflects whether the auth store has a currentBranch selected.
      // It is validated here so the form blocks submission and surfaces a clear
      // error message instead of crashing with a non-null assertion at runtime.
      hasBranch: z.boolean(),
    })
    .superRefine((v, ctx) => {
      if (v.mode === 'create') {
        if (!v.code?.trim()) {
          ctx.addIssue({ code: 'custom', path: ['code'], message: 'El código es requerido' })
        }
        if (!v.start_date) {
          ctx.addIssue({
            code: 'custom',
            path: ['start_date'],
            message: 'La fecha de ingreso es requerida',
          })
        }
        if (!v.hasBranch) {
          ctx.addIssue({
            code: 'custom',
            path: ['start_date'],
            message: 'Selecciona una sucursal antes de registrar un empleado',
          })
        }
      }
      if (v.canEditContact && !v.email?.trim() && !v.phone?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['email'],
          message: 'Email o teléfono es requerido',
        })
      }
    })
}

// ─── Role toggle ───────────────────────────────────────────────────────────────
// Extracted to module scope to keep the ToggleSwitch onChange handler shallow
// (SonarCloud typescript:S2004 — functions should not be nested too deeply).
// Split into two named functions rather than one function with a boolean
// selector param (SonarCloud typescript:S2301 — methods should not contain
// selector parameters); the ternary lives at the call site instead.

function addRole(currentRoles: string[], role: string): string[] {
  return [...currentRoles, role]
}

function removeRole(currentRoles: string[], role: string): string[] {
  return currentRoles.filter((r) => r !== role)
}

// ─── Form value type ───────────────────────────────────────────────────────────

type EmployeeFormSchema = ReturnType<typeof buildSchema>
export type EmployeeFormValues = z.infer<EmployeeFormSchema>

// ─── Props ─────────────────────────────────────────────────────────────────────

interface EmployeeEditCreateFormProps {
  mode: 'create' | 'edit'
  /** Full employee record (required when mode === 'edit') */
  employee?: Employee | null
  assignableRoles: EmployeePositionRole[]
  assignableRolesLoading: boolean
  assignableRolesError: boolean
  isAdmin: boolean
  /** Branch name shown as hint on start_date field (create mode only) */
  branchName?: string
  /** Whether the auth store has a currentBranch selected (used to block create submission) */
  hasBranch: boolean
  /** True when the API mutation is in-flight */
  isLoading: boolean
  onRefreshCode: () => void
  isRefreshingCode: boolean
  onSubmit: (values: EmployeeFormValues) => void
  onCancel: () => void
  /** Current auto-suggested code from the API (create mode only) */
  suggestedCode?: string
  isSuggestedCodeLoading: boolean
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function EmployeeEditCreateForm({
  mode,
  employee,
  assignableRoles,
  assignableRolesLoading,
  assignableRolesError,
  isAdmin,
  branchName,
  hasBranch,
  isLoading,
  onRefreshCode,
  isRefreshingCode,
  onSubmit,
  onCancel,
  suggestedCode,
  isSuggestedCodeLoading,
}: Readonly<EmployeeEditCreateFormProps>) {
  const canEditContact = mode === 'create' || isAdmin

  // Fresh per mount — avoids stale module-level date when the app stays open past midnight.
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // Rebuild schema whenever assignable roles change (validates role values against server list).
  const schema = useMemo(() => buildSchema(assignableRoles), [assignableRoles])

  // ── Stable identity key for the current form context ─────────────────────────
  // We use this to detect a genuine context switch (mode change or different
  // employee) that justifies a full reset, vs. async data arriving for the
  // same form that should only patch specific fields.
  const formContextKey = mode === 'edit' ? `edit-${employee?.id ?? ''}` : 'create'

  // Default values for a full reset — does NOT include suggestedCode so that
  // an async code response never triggers a destructive reset.
  const baseDefaultValues = useMemo((): EmployeeFormValues => {
    if (mode === 'edit' && employee) {
      return {
        mode: 'edit',
        code: employee.code,
        first_name: employee.user.first_name ?? '',
        last_name: employee.user.last_name ?? '',
        // Only include roles the current user can assign (others are preserved server-side).
        roles: (employee.roles || []).filter((r) => assignableRoles.includes(r)),
        email: employee.user.email ?? '',
        phone: employee.user.phone ?? '',
        start_date: '',
        attendance_exempt: employee.attendance_exempt,
        canEditContact,
        hasBranch,
      }
    }
    return {
      mode: 'create',
      code: '',   // populated by the suggestedCode effect below, not via reset
      first_name: '',
      last_name: '',
      roles: [],
      email: '',
      phone: '',
      start_date: today,
      // Disabled by default — most employees are tied to attendance tracking.
      attendance_exempt: false,
      canEditContact,
      hasBranch,
    }
  }, [mode, employee, assignableRoles, today, canEditContact, hasBranch]) // suggestedCode intentionally excluded

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: baseDefaultValues,
  })

  // Full reset only when the form context changes (mode switch or different employee).
  // This is the only safe moment to wipe all user input.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reset(baseDefaultValues) }, [formContextKey])

  // Patch just the code field when the async suggestion arrives (create mode).
  // Using setValue instead of reset preserves any fields the user has already filled.
  useEffect(() => {
    if (mode === 'create' && suggestedCode) {
      setValue('code', suggestedCode, { shouldValidate: false })
    }
  }, [mode, suggestedCode, setValue])

  // Keep hasBranch in sync with the auth store without resetting the whole form.
  // This lets an admin select a branch while the panel is already open.
  useEffect(() => {
    setValue('hasBranch', hasBranch, { shouldValidate: false })
  }, [hasBranch, setValue])

  const emailValue = watch('email')
  const rolesValue = watch('roles')

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
      {/* Code — create mode only (immutable on edit) */}
      {mode === 'create' && (
        <FormField
          label="Código"
          error={errors.code?.message}
          required
          hint="Código sugerido automáticamente. Puedes modificarlo."
        >
          <div className="relative">
            <input
              type="text"
              {...register('code')}
              disabled={isSuggestedCodeLoading}
              className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md font-mono disabled:opacity-50 disabled:cursor-not-allowed pr-10 uppercase"
              placeholder={isSuggestedCodeLoading ? 'Cargando...' : 'EMP-001'}
              maxLength={20}
            />
            <button
              type="button"
              onClick={onRefreshCode}
              disabled={isRefreshingCode}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Obtener siguiente código disponible"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshingCode ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </FormField>
      )}

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nombre" error={errors.first_name?.message} required>
          <input
            type="text"
            {...register('first_name')}
            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
            placeholder="Juan"
            maxLength={100}
          />
        </FormField>

        <FormField label="Apellido" error={errors.last_name?.message} required>
          <input
            type="text"
            {...register('last_name')}
            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
            placeholder="Perez"
            maxLength={100}
          />
        </FormField>
      </div>

      {/* Position roles */}
      <FormField
        label="Puestos"
        error={errors.roles?.message}
        required
        hint="Selecciona uno o más puestos para el empleado"
      >
        <Controller
          name="roles"
          control={control}
          render={({ field }) => {
            let rolesContent: React.ReactNode
            if (assignableRolesLoading) {
              rolesContent = (
                <div className="col-span-2 flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cargando puestos...
                </div>
              )
            } else if (assignableRolesError) {
              rolesContent = (
                <p className="col-span-2 text-sm text-destructive">
                  Error al cargar puestos. Recarga la página.
                </p>
              )
            } else {
              rolesContent = assignableRoles.map((role) => (
                <ToggleSwitch
                  key={role}
                  label={EMPLOYEE_POSITION_ROLES[role as EmployeePositionRole] || role}
                  checked={(rolesValue || []).includes(role)}
                  onChange={(checked) => {
                    const currentRoles = (field.value as string[]) || []
                    field.onChange(checked ? addRole(currentRoles, role) : removeRole(currentRoles, role))
                  }}
                />
              ))
            }
            return (
              <div className="grid grid-cols-2 gap-3 rounded-md border border-input p-3">
                {rolesContent}
              </div>
            )
          }}
        />
      </FormField>

      {/* Attendance exemption — off by default; enable for roles free of attendance tracking (e.g. admin) */}
      <FormField
        label="Asistencia"
        hint="Si se habilita, este empleado no aparecerá en la lista de asistencia (su asistencia se considera automática)"
      >
        <Controller
          name="attendance_exempt"
          control={control}
          render={({ field }) => (
            <ToggleSwitch
              label="Libre de asistencia"
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      {/* Email */}
      <FormField
        label="Email"
        error={errors.email?.message}
        hint={canEditContact ? 'Requerido si no proporciona teléfono' : undefined}
      >
        <input
          type="email"
          {...register('email')}
          disabled={!canEditContact}
          className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted"
          placeholder={!canEditContact ? 'Sin email registrado' : 'juan@example.com'}
          maxLength={255}
        />
      </FormField>

      {/* Phone */}
      <FormField
        label="Teléfono"
        hint={
          canEditContact
            ? 'Requerido si no proporciona email. Solo el número nacional (10 dígitos).'
            : undefined
        }
      >
        <div className="flex">
          <span className="inline-flex items-center px-3 py-2 border border-r-0 border-input bg-muted text-muted-foreground rounded-l-md text-sm">
            +52
          </span>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <input
                type="tel"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                disabled={!canEditContact}
                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-r-md rounded-l-none disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted"
                placeholder={!canEditContact ? 'Sin teléfono registrado' : '5512345678'}
                maxLength={10}
              />
            )}
          />
        </div>
      </FormField>

      {/* Start date — create mode only */}
      {mode === 'create' && (
        <FormField
          label="Fecha de ingreso"
          error={errors.start_date?.message}
          required
          hint={branchName ? `Sucursal: ${branchName}` : undefined}
        >
          <input
            type="date"
            {...register('start_date')}
            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
          />
        </FormField>
      )}

      {/* Welcome notification hint */}
      {mode === 'create' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <p>
            El empleado recibirá un enlace para configurar su contraseña por{' '}
            {emailValue?.trim() ? 'correo electrónico' : 'WhatsApp'}.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="neutral"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="info"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'edit' ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  )
}
