import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import { useCreateEmployee, useUpdateEmployee, useToggleEmployeeActive, useNextEmployeeCode, useEmployee } from '@/services/employee-hooks'
import { EMPLOYEE_POSITION_ROLES } from '@/types/employee'
import type { Employee, EmployeeFormData, EmployeeUpdateData, EmployeePositionRole } from '@/types/employee'
import { useAuthStore } from '@/stores/auth.store'
import { Loader2, Power, RefreshCw } from 'lucide-react'
import { useForm, Controller, useWatch } from 'react-hook-form'

interface EmployeeFormProps {
    employee?: Employee | null
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function EmployeeForm({
    employee,
    isOpen,
    onClose,
    onSuccess,
}: EmployeeFormProps) {
    const isEditing = !!employee
    const isAdmin = useAuthStore((s) => s.isAdmin)
    const canEditContact = !isEditing || isAdmin

    // Fetch full employee data when editing to get email/phone from user
    const employeeQuery = useEmployee(isOpen && isEditing && employee?.id ? employee.id : '')
    const fullEmployee = employeeQuery.data || employee

    const { register, handleSubmit, control, reset, setError, clearErrors, setValue, getValues, formState } = useForm<EmployeeFormData>({
        defaultValues: {
            code: '',
            first_name: '',
            last_name: '',
            roles: [],
            email: '',
            phone: '',
        },
    })
    const errors = formState.errors as Record<string, any>
    const [showToggleConfirm, setShowToggleConfirm] = useState(false)

    const nextCodeQuery = useNextEmployeeCode(isOpen && !isEditing)

    useEffect(() => {
        if (fullEmployee && isEditing) {
            reset({
                code: fullEmployee.code,
                first_name: fullEmployee.first_name,
                last_name: fullEmployee.last_name,
                roles: fullEmployee.roles || [],
                email: fullEmployee.email || '',
                phone: fullEmployee.phone || '',
            })
        } else if (!isEditing) {
            reset({ code: '', first_name: '', last_name: '', roles: [], email: '', phone: '' })
            if (isOpen) {
                nextCodeQuery.refetch().then(result => {
                    if (result.data?.code) {
                        setValue('code', result.data.code)
                    }
                })
            }
        }
        setShowToggleConfirm(false)
    }, [fullEmployee, isEditing, isOpen, reset, setValue]) // eslint-disable-line react-hooks/exhaustive-deps

    const createMutation = useCreateEmployee()
    const updateMutation = useUpdateEmployee()
    const toggleMutation = useToggleEmployeeActive()

    const onSubmit = async () => {
        clearErrors()

        const values = getValues()

        const newErrors: Record<string, string> = {}

        if (!values.code?.trim()) newErrors.code = 'El código es requerido'
        if (!values.first_name?.trim()) newErrors.first_name = 'El nombre es requerido'
        if (!values.last_name?.trim()) newErrors.last_name = 'El apellido es requerido'
        if (!values.roles || values.roles.length === 0) newErrors.roles = 'Selecciona al menos un puesto'

        if (!isEditing || isAdmin) {
            const hasEmail = values.email?.trim()
            const hasPhone = values.phone?.trim()
            if (!hasEmail && !hasPhone) newErrors.email = 'Email o teléfono es requerido'
        }

        if (Object.keys(newErrors).length > 0) {
            Object.entries(newErrors).forEach(([k, v]) => setError(k as any, { type: 'manual', message: v }))
            return
        }

        try {
            if (isEditing && employee) {
                const updateData: EmployeeUpdateData = {
                    first_name: values.first_name,
                    last_name: values.last_name,
                    roles: values.roles,
                }
                // Only send contact fields if they actually changed to avoid unnecessary writes
                if (isAdmin && fullEmployee) {
                    const originalEmail = fullEmployee.email || ''
                    const originalPhone = fullEmployee.phone || ''
                    if ((values.email || '') !== originalEmail) {
                        updateData.email = values.email || ''
                    }
                    if ((values.phone || '') !== originalPhone) {
                        updateData.phone = values.phone || ''
                    }
                }
                await updateMutation.mutateAsync({ id: employee.id, data: updateData })
            } else {
                await createMutation.mutateAsync(values)
            }
            onSuccess()
        } catch (error) {
            console.error('Error submitting form:', error)
        }
    }

    const handleToggleActive = async () => {
        if (!employee) return
        try {
            await toggleMutation.mutateAsync(employee.id)
            setShowToggleConfirm(false)
            onSuccess()
        } catch (error) {
            console.error('Error toggling active:', error)
        }
    }

    const handleRoleToggle = (currentRoles: EmployeePositionRole[], role: EmployeePositionRole, checked: boolean) => {
        const newRoles = checked ? [...currentRoles, role] : currentRoles.filter((r) => r !== role)
        setValue('roles', newRoles)
        // clear role error if present
        if (errors.roles) clearErrors('roles')
    }

    const watchedEmail = useWatch({ control, name: 'email' })
    const isLoading = createMutation.isPending || updateMutation.isPending || toggleMutation.isPending || employeeQuery.isLoading

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}
            description={isEditing ? 'Actualiza los datos del empleado' : 'Registra un nuevo empleado en el sistema'}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Toggle active section for editing */}
                {isEditing && fullEmployee && (
                    <div className={`flex items-center justify-between rounded-lg border p-3 ${fullEmployee.is_active
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
                        }`}>
                        <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${fullEmployee.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                {fullEmployee.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        {showToggleConfirm ? (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    {fullEmployee.is_active ? 'Desactivar?' : 'Activar?'}
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleToggleActive}
                                    disabled={isLoading}
                                    className="bg-amber-600 text-white hover:bg-amber-700"
                                >
                                    {toggleMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                    Confirmar
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setShowToggleConfirm(false)}
                                    disabled={isLoading}
                                    className="bg-gray-200 text-gray-800 hover:bg-gray-300"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setShowToggleConfirm(true)}
                                disabled={isLoading}
                                className={fullEmployee.is_active
                                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }
                            >
                                <Power className="mr-1 h-3 w-3" />
                                {fullEmployee.is_active ? 'Desactivar' : 'Activar'}
                            </Button>
                        )}
                    </div>
                )}

                <FormField
                    label="Código"
                    error={errors.code?.message}
                    required
                    hint={isEditing ? undefined : 'Código sugerido automáticamente. Puedes modificarlo.'}
                >
                    <div className="relative">
                        <Controller
                            control={control}
                            name="code"
                            render={({ field }) => (
                                <input
                                    type="text"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    disabled={isEditing}
                                    className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md font-mono disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                                    placeholder={nextCodeQuery.isLoading ? 'Cargando...' : 'EMP-001'}
                                    maxLength={20}
                                />
                            )}
                        />
                        {!isEditing && (
                            <button
                                type="button"
                                onClick={() => nextCodeQuery.refetch()}
                                disabled={nextCodeQuery.isFetching}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                                title="Obtener siguiente codigo disponible"
                            >
                                <RefreshCw className={`h-4 w-4 ${nextCodeQuery.isFetching ? 'animate-spin' : ''}`} />
                            </button>
                        )}
                    </div>
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        label="Nombre"
                        error={errors.first_name?.message}
                        required
                    >
                        <input
                            type="text"
                            {...register('first_name')}
                            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
                            placeholder="Juan"
                            maxLength={100}
                        />
                    </FormField>

                    <FormField
                        label="Apellido"
                        error={errors.last_name?.message}
                        required
                    >
                        <input
                            type="text"
                            {...register('last_name')}
                            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
                            placeholder="Perez"
                            maxLength={100}
                        />
                    </FormField>
                </div>

                <FormField
                    label="Puestos"
                    error={errors.roles?.message}
                    required
                    hint="Selecciona uno o más puestos para el empleado"
                >
                    <div className="grid grid-cols-2 gap-3 rounded-md border border-input p-3">
                        {(Object.entries(EMPLOYEE_POSITION_ROLES) as [EmployeePositionRole, string][]).map(([role, label]) => (
                            <Controller
                                key={role}
                                control={control}
                                name="roles"
                                render={({ field }) => (
                                    <ToggleSwitch
                                        label={label}
                                        checked={(field.value || []).includes(role)}
                                        onChange={(checked) => handleRoleToggle(field.value || [], role, checked)}
                                    />
                                )}
                            />
                        ))}
                    </div>
                </FormField>

                {/* Email field - editable on create and for admins on edit */}
                <FormField
                    label="Email"
                    error={errors.email?.message}
                    hint={canEditContact ? "Requerido si no proporciona teléfono" : undefined}
                >
                    <input
                        type="email"
                        {...register('email')}
                        disabled={!canEditContact}
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted"
                        placeholder={!canEditContact ? "Sin email registrado" : "juan@example.com"}
                        maxLength={255}
                    />
                </FormField>

                {/* Phone field - editable on create and for admins on edit */}
                <FormField
                    label="Teléfono"
                    hint={canEditContact ? "Requerido si no proporciona email. Solo el número nacional (10 dígitos)." : undefined}
                >
                    <div className="flex">
                        <span className="inline-flex items-center px-3 py-2 border border-r-0 border-input bg-muted text-muted-foreground rounded-l-md text-sm">
                            +52
                        </span>
                        <Controller
                            control={control}
                            name="phone"
                            render={({ field }) => (
                                <input
                                    type="tel"
                                    {...field}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '')
                                        field.onChange(value)
                                    }}
                                    disabled={!canEditContact}
                                    className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-r-md rounded-l-none disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted"
                                    placeholder={!canEditContact ? "Sin telefono registrado" : "5512345678"}
                                    maxLength={10}
                                />
                            )}
                        />
                    </div>
                </FormField>

                {!isEditing && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                        <p>El empleado recibirá un enlace para configurar su contraseña por {watchedEmail?.trim() ? 'correo electrónico' : 'WhatsApp'}.</p>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="bg-gray-200 text-gray-800 hover:bg-gray-300"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        {(createMutation.isPending || updateMutation.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isEditing ? 'Actualizar' : 'Crear'}
                    </Button>
                </div>
            </form>
        </SlidePanel>
    )
}
