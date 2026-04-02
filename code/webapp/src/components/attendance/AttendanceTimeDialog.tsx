import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// ── Schema ─────────────────────────────────────────────────────────────────────

function createTimeSchema(maxTime: string) {
    return z.object({
        time: z
            .string()
            .min(1, 'La hora es requerida')
            .refine((val) => /^\d{2}:\d{2}$/.test(val), 'Formato inválido (HH:mm)')
            .refine(
                (val) => val <= maxTime,
                `La hora no puede ser posterior a ${maxTime}`
            ),
    })
}

export type TimeFormValues = z.infer<ReturnType<typeof createTimeSchema>>

// ── Hook ───────────────────────────────────────────────────────────────────────

export interface UseAttendanceTimeDialogParams {
    isOpen: boolean
    initialTime: string
    maxTime: string
    onConfirm: (time: string) => void
    onClose: () => void
}

export function useAttendanceTimeDialog({
    isOpen,
    initialTime,
    maxTime,
    onConfirm,
    onClose,
}: Readonly<UseAttendanceTimeDialogParams>) {
    const schema = createTimeSchema(maxTime)

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isValid },
    } = useForm<TimeFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { time: initialTime },
        mode: 'onChange',
    })

    // Track previous open state to detect open transition
    const wasOpenRef = useRef(false)

    // Reset form only when dialog opens (false → true), not when initialTime changes
    useEffect(() => {
        if (isOpen && !wasOpenRef.current) {
            reset({ time: initialTime })
        }
        wasOpenRef.current = isOpen
    }, [isOpen, initialTime, reset])

    const time = watch('time')

    const handleConfirm = handleSubmit((data) => {
        onConfirm(data.time)
    })

    const handleClose = () => {
        reset({ time: '' })
        onClose()
    }

    return {
        register,
        errors,
        isValid,
        time,
        handleConfirm,
        handleClose,
    }
}

// ── Component ──────────────────────────────────────────────────────────────────

export interface AttendanceTimeDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (time: string) => void
    title: string
    employeeName: string
    confirmLabel: string
    initialTime: string
    maxTime: string
    inputId: string
    inputLabel: string
    isLoading?: boolean
}

export function AttendanceTimeDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    employeeName,
    confirmLabel,
    initialTime,
    maxTime,
    inputId,
    inputLabel,
    isLoading = false,
}: Readonly<AttendanceTimeDialogProps>) {
    const { register, errors, isValid, handleConfirm, handleClose } =
        useAttendanceTimeDialog({
            isOpen,
            initialTime,
            maxTime,
            onConfirm,
            onClose,
        })

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
            title={title}
            description={
                <span className="flex flex-col gap-3">
                    <span>{`¿Confirmas la acción para ${employeeName}?`}</span>
                    <span className="flex flex-col gap-1">
                        <span className="flex items-center gap-2">
                            <label
                                htmlFor={inputId}
                                className="text-sm font-medium text-foreground whitespace-nowrap"
                            >
                                {inputLabel}:
                            </label>
                            <input
                                id={inputId}
                                type="time"
                                max={maxTime}
                                {...register('time')}
                                className="rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
                            />
                        </span>
                        {errors.time && (
                            <span className="text-xs text-destructive">{errors.time.message}</span>
                        )}
                    </span>
                </span>
            }
            confirmLabel={confirmLabel}
            variant="info"
            isLoading={isLoading}
            confirmDisabled={!isValid}
        />
    )
}
