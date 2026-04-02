import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ── Schema ─────────────────────────────────────────────────────────────────────

export function createTimeSchema(maxTime: string) {
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
        trigger,
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
            // Trigger validation after reset to update isValid
            void trigger('time')
        }
        wasOpenRef.current = isOpen
    }, [isOpen, initialTime, reset, trigger])

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
