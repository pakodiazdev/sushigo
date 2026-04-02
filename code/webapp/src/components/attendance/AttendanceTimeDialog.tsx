import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useAttendanceTimeDialog } from './use-attendance-time-dialog'

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
