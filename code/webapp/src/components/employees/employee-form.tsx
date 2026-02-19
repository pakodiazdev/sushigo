import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import { useCreateEmployee, useUpdateEmployee, useNextEmployeeCode, useEmployee, useDeactivateEmployee, useRehireEmployee, useToggleEmployeeActive, useAssignableRoles } from '@/services/employee-hooks'
import { EMPLOYEE_POSITION_ROLES } from '@/types/employee'
import type { Employee, EmployeeFormData, EmployeeUpdateData, EmployeePositionRole } from '@/types/employee'
import { useAuthStore } from '@/stores/auth.store'
import { Loader2, RefreshCw } from 'lucide-react'
import { EmployeeDetailView } from './employee-detail-view'

type PanelMode = 'detail' | 'edit' | 'create'

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
    const currentBranch = useAuthStore((s) => s.currentBranch)
    const canEditContact = !isEditing || isAdmin

    const [mode, setMode] = useState<PanelMode>('create')

    // Fetch full employee data when editing to get email/phone from user
    const employeeQuery = useEmployee(isOpen && isEditing && employee?.id ? employee.id : '')
    const fullEmployee = employeeQuery.data || employee

    const [formData, setFormData] = useState<EmployeeFormData>({
        code: '',
        first_name: '',
        last_name: '',
        roles: [],
        email: '',
        phone: '',
        start_date: new Date().toISOString().slice(0, 10),
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    const nextCodeQuery = useNextEmployeeCode(isOpen && !isEditing)
    const assignableRolesQuery = useAssignableRoles()

    useEffect(() => {
        if (isEditing) {
            setMode('detail')
        } else {
            setMode('create')
        }
    }, [isEditing, isOpen])

    useEffect(() => {
        if (fullEmployee && isEditing) {
            setFormData({
                code: fullEmployee.code,
                first_name: fullEmployee.first_name,
                last_name: fullEmployee.last_name,
                roles: fullEmployee.roles || [],
                email: fullEmployee.email || '',
                phone: fullEmployee.phone || '',
                start_date: new Date().toISOString().slice(0, 10),
            })
        } else if (!isEditing) {
            setFormData({
                code: '',
                first_name: '',
                last_name: '',
                roles: [],
                email: '',
                phone: '',
                start_date: new Date().toISOString().slice(0, 10),
            })
            if (isOpen) {
                nextCodeQuery.refetch().then(result => {
                    const code = result.data?.code
                    if (code) {
                        setFormData(prev => ({ ...prev, code }))
                    }
                })
            }
        }
        setErrors({})
    }, [fullEmployee, isEditing, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

    const createMutation = useCreateEmployee()
    const updateMutation = useUpdateEmployee()
    const deactivateMutation = useDeactivateEmployee()
    const rehireMutation = useRehireEmployee()
    const toggleActiveMutation = useToggleEmployeeActive()

    const handleChange = (field: keyof EmployeeFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev }
                delete next[field]
                return next
            })
        }
    }

    const handleRoleToggle = (role: EmployeePositionRole, checked: boolean) => {
        const newRoles = checked
            ? [...formData.roles, role]
            : formData.roles.filter((r) => r !== role)
        setFormData(prev => ({ ...prev, roles: newRoles }))
        if (errors.roles) {
            setErrors(prev => {
                const next = { ...prev }
                delete next.roles
                return next
            })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const newErrors: Record<string, string> = {}

        if (!formData.code?.trim()) newErrors.code = 'El código es requerido'
        if (!formData.first_name?.trim()) newErrors.first_name = 'El nombre es requerido'
        if (!formData.last_name?.trim()) newErrors.last_name = 'El apellido es requerido'
        if (!formData.roles || formData.roles.length === 0) newErrors.roles = 'Selecciona al menos un puesto'

        if (mode === 'create') {
            if (!formData.start_date) {
                newErrors.start_date = 'La fecha de ingreso es requerida'
            }
            if (!currentBranch) {
                newErrors.branch = 'No hay sucursal seleccionada'
            }
        }

        if (!isEditing || isAdmin) {
            const hasEmail = formData.email?.trim()
            const hasPhone = formData.phone?.trim()
            if (!hasEmail && !hasPhone) newErrors.email = 'Email o teléfono es requerido'
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        try {
            if (mode === 'edit' && employee) {
                const updateData: EmployeeUpdateData = {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    roles: formData.roles,
                }
                if (isAdmin) {
                    const originalEmail = fullEmployee?.email || ''
                    const originalPhone = fullEmployee?.phone || ''
                    const newEmail = formData.email?.trim() || ''
                    const newPhone = formData.phone?.trim() || ''
                    // Solo enviar el campo si cambió respecto al valor original.
                    // Esto preserva el comportamiento `sometimes` del backend:
                    // los campos ausentes se ignoran, y `required_without` solo
                    // se aplica cuando ambos están presentes en el request.
                    if (newEmail !== originalEmail) updateData.email = newEmail
                    if (newPhone !== originalPhone) updateData.phone = newPhone
                }
                await updateMutation.mutateAsync({
                    id: employee.id,
                    data: updateData,
                })
                setMode('detail')
            } else {
                await createMutation.mutateAsync({
                    ...formData,
                    branch_id: currentBranch!.id,
                })
                onSuccess()
            }
        } catch (error) {
            console.error('Error submitting form:', error)
        }
    }

    const handleDeactivate = async (endDate: string, reason?: string) => {
        if (!employee) return
        try {
            await deactivateMutation.mutateAsync({
                id: employee.id,
                data: { end_date: endDate, termination_reason: reason },
            })
            onSuccess()
        } catch (error) {
            console.error('Error deactivating:', error)
        }
    }

    const handleRehire = async (startDate: string, branchId: number) => {
        if (!employee) return
        try {
            await rehireMutation.mutateAsync({
                id: employee.id,
                data: { branch_id: branchId, start_date: startDate },
            })
            onSuccess()
            onClose()
        } catch (error) {
            console.error('Error rehiring:', error)
        }
    }

    const handleToggleActive = async () => {
        if (!employee) return
        try {
            await toggleActiveMutation.mutateAsync(employee.id)
            onSuccess()
        } catch (error) {
            console.error('Error toggling active:', error)
        }
    }

    const isLoading = createMutation.isPending || updateMutation.isPending || deactivateMutation.isPending || rehireMutation.isPending || toggleActiveMutation.isPending || employeeQuery.isLoading || assignableRolesQuery.isLoading

    const panelTitle = mode === 'create'
        ? 'Nuevo Empleado'
        : mode === 'edit'
            ? 'Editar Empleado'
            : 'Detalle de Empleado'

    const panelDescription = mode === 'create'
        ? 'Registra un nuevo empleado en el sistema'
        : mode === 'edit'
            ? 'Actualiza los datos del empleado'
            : undefined

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={panelTitle}
            description={panelDescription}
        >
            {/* Detail mode */}
            {mode === 'detail' && fullEmployee && (
                <div key="detail" className="animate-fade-in">
                    <EmployeeDetailView
                        employee={fullEmployee}
                        onEdit={() => setMode('edit')}
                        onDeactivate={handleDeactivate}
                        onRehire={handleRehire}
                        onToggleActive={handleToggleActive}
                        isDeactivating={deactivateMutation.isPending}
                        isRehiring={rehireMutation.isPending}
                        isTogglingActive={toggleActiveMutation.isPending}
                    />
                </div>
            )}

            {/* Loading state for detail mode */}
            {mode === 'detail' && !fullEmployee && employeeQuery.isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Edit / Create mode */}
            {(mode === 'edit' || mode === 'create') && (
                <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in" key={mode}>
                    <FormField
                        label="Código"
                        error={errors.code}
                        required
                        hint={mode === 'create' ? 'Código sugerido automáticamente. Puedes modificarlo.' : undefined}
                    >
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                                disabled={mode === 'edit'}
                                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md font-mono disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                                placeholder={nextCodeQuery.isLoading ? 'Cargando...' : 'EMP-001'}
                                maxLength={20}
                            />
                            {mode === 'create' && (
                                <button
                                    type="button"
                                    onClick={() => nextCodeQuery.refetch()}
                                    disabled={nextCodeQuery.isFetching}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                                    title="Obtener siguiente código disponible"
                                >
                                    <RefreshCw className={`h-4 w-4 ${nextCodeQuery.isFetching ? 'animate-spin' : ''}`} />
                                </button>
                            )}
                        </div>
                    </FormField>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            label="Nombre"
                            error={errors.first_name}
                            required
                        >
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => handleChange('first_name', e.target.value)}
                                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
                                placeholder="Juan"
                                maxLength={100}
                            />
                        </FormField>

                        <FormField
                            label="Apellido"
                            error={errors.last_name}
                            required
                        >
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => handleChange('last_name', e.target.value)}
                                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
                                placeholder="Perez"
                                maxLength={100}
                            />
                        </FormField>
                    </div>

                    <FormField
                        label="Puestos"
                        error={errors.roles}
                        required
                        hint="Selecciona uno o más puestos para el empleado"
                    >
                        <div className="grid grid-cols-2 gap-3 rounded-md border border-input p-3">
                            {assignableRolesQuery.isLoading ? (
                                <div className="col-span-2 flex items-center justify-center py-4 text-sm text-muted-foreground">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Cargando puestos...
                                </div>
                            ) : assignableRolesQuery.isError ? (
                                <p className="col-span-2 text-sm text-destructive">
                                    Error al cargar puestos. Recarga la página.
                                </p>
                            ) : (
                                (assignableRolesQuery.data || []).map((role) => (
                                    <ToggleSwitch
                                        key={role}
                                        label={EMPLOYEE_POSITION_ROLES[role as EmployeePositionRole] || role}
                                        checked={formData.roles.includes(role as EmployeePositionRole)}
                                        onChange={(checked) => handleRoleToggle(role as EmployeePositionRole, checked)}
                                    />
                                ))
                            )}
                        </div>
                    </FormField>

                    {/* Email field */}
                    <FormField
                        label="Email"
                        error={errors.email}
                        hint={canEditContact ? "Requerido si no proporciona teléfono" : undefined}
                    >
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            disabled={!canEditContact}
                            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted"
                            placeholder={!canEditContact ? "Sin email registrado" : "juan@example.com"}
                            maxLength={255}
                        />
                    </FormField>

                    {/* Phone field */}
                    <FormField
                        label="Teléfono"
                        hint={canEditContact ? "Requerido si no proporciona email. Solo el número nacional (10 dígitos)." : undefined}
                    >
                        <div className="flex">
                            <span className="inline-flex items-center px-3 py-2 border border-r-0 border-input bg-muted text-muted-foreground rounded-l-md text-sm">
                                +52
                            </span>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '')
                                    handleChange('phone', value)
                                }}
                                disabled={!canEditContact}
                                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-r-md rounded-l-none disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted"
                                placeholder={!canEditContact ? "Sin teléfono registrado" : "5512345678"}
                                maxLength={10}
                            />
                        </div>
                    </FormField>

                    {/* Start date - only on create */}
                    {mode === 'create' && (
                        <FormField
                            label="Fecha de ingreso"
                            error={errors.start_date || errors.branch}
                            required
                            hint={currentBranch ? `Sucursal: ${currentBranch.name}` : undefined}
                        >
                            <input
                                type="date"
                                value={formData.start_date || ''}
                                onChange={(e) => handleChange('start_date', e.target.value)}
                                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
                            />
                        </FormField>
                    )}

                    {mode === 'create' && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                            <p>El empleado recibirá un enlace para configurar su contraseña por {formData.email?.trim() ? 'correo electrónico' : 'WhatsApp'}.</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            onClick={() => {
                                if (mode === 'edit') {
                                    setMode('detail')
                                } else {
                                    onClose()
                                }
                            }}
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
                            {mode === 'edit' ? 'Actualizar' : 'Crear'}
                        </Button>
                    </div>
                </form>
            )}
        </SlidePanel>
    )
}
