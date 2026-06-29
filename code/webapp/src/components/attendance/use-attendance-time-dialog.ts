import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ── Schema ─────────────────────────────────────────────────────────────────────

export function createTimeSchema(maxTime: string, requiresReason = false) {
    return z.object({
        time: z
            .string()
            .min(1, 'La hora es requerida')
            .refine((val) => /^\d{2}:\d{2}$/.test(val), 'Formato inválido (HH:mm)')
            .refine(
                (val) => val <= maxTime,
                `La hora no puede ser posterior a ${maxTime}`
            ),
        reason: requiresReason
            ? z.string().min(5, 'El motivo debe tener al menos 5 caracteres').max(500)
            : z.string().max(500).optional(),
    })
}

export type TimeFormValues = z.infer<ReturnType<typeof createTimeSchema>>

// ── Hook ───────────────────────────────────────────────────────────────────────

export interface UseAttendanceTimeDialogParams {
    isOpen: boolean
    initialTime: string
    maxTime: string
    requiresReason?: boolean
    onConfirm: (time: string, reason?: string) => void
    onClose: () => void
}

export function useAttendanceTimeDialog({
    isOpen,
    initialTime,
    maxTime,
    requiresReason = false,
    onConfirm,
    onClose,
}: Readonly<UseAttendanceTimeDialogParams>) {
    const schema = createTimeSchema(maxTime, requiresReason)

    const {
        register,
        handleSubmit,
        reset,
        watch,
        trigger,
        formState: { errors, isValid },
    } = useForm<TimeFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { time: initialTime, reason: '' },
        mode: 'onChange',
    })

    // Track previous open state to detect open transition
    const wasOpenRef = useRef(false)

    // Reset form only when dialog opens (false → true), not when initialTime changes
    useEffect(() => {
        if (isOpen && !wasOpenRef.current) {
            reset({ time: initialTime, reason: '' })
            // Trigger validation after reset to update isValid
            trigger('time')
        }
        wasOpenRef.current = isOpen
    }, [isOpen, initialTime, reset, trigger])

    const time = watch('time')

    const handleConfirm = handleSubmit((data) => {
        onConfirm(data.time, data.reason || undefined)
    })

    const handleClose = () => {
        reset({ time: '', reason: '' })
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
