import { useState, useEffect, useCallback } from 'react'
import type { CreateWageData } from '@/types/wage-history'
import { calcularNetoDesdebruto, calcularBrutoDesdeNeto } from './use-wage-calculations'

export type ActiveSalaryInput = 'bruto' | 'neto' | 'diario' | null

export interface WageFormState {
    formData: CreateWageData
    weeklySalaryBruto: number
    weeklySalaryNeto: number
    dailySalary: number
    activeInput: ActiveSalaryInput
    errors: Partial<Record<keyof CreateWageData, string>>
    weeklySalaryError: string
}

export interface WageFormActions {
    handleBrutoChange: (value: number) => void
    handleNetoChange: (value: number) => void
    handleDailySalaryChange: (value: number) => void
    handleHourlyRateChange: (value: number) => void
    handleWeeklyHoursChange: (value: number) => void
    handleEffectiveFromChange: (value: string) => void
    handleNotesChange: (value: string) => void
    validate: () => boolean
    getSubmitData: () => CreateWageData
}

export function useWageForm(): WageFormState & WageFormActions {
    const today = new Date().toISOString().split('T')[0] ?? ''

    const [formData, setFormData] = useState<CreateWageData>({
        hourly_rate: 0,
        weekly_scheduled_hours: 48,
        effective_from: today,
        notes: '',
    })

    const [weeklySalaryBruto, setWeeklySalaryBruto] = useState<number>(0)
    const [weeklySalaryNeto, setWeeklySalaryNeto] = useState<number>(0)
    const [dailySalary, setDailySalary] = useState<number>(0)
    const [activeInput, setActiveInput] = useState<ActiveSalaryInput>(null)
    const [errors, setErrors] = useState<Partial<Record<keyof CreateWageData, string>>>({})
    const [weeklySalaryError, setWeeklySalaryError] = useState<string>('')

    // ─── Handlers Sincronizados ────────────────────────────────────────────────

    const handleBrutoChange = useCallback((value: number) => {
        setActiveInput('bruto')
        setWeeklySalaryBruto(value)
        const netoCalculado = calcularNetoDesdebruto(value)
        setWeeklySalaryNeto(Math.round(netoCalculado * 100) / 100)
        setDailySalary(Math.round((value / 7) * 100) / 100)
    }, [])

    const handleNetoChange = useCallback((value: number) => {
        setActiveInput('neto')
        setWeeklySalaryNeto(value)
        const brutoCalculado = calcularBrutoDesdeNeto(value)
        setWeeklySalaryBruto(Math.round(brutoCalculado * 100) / 100)
        setDailySalary(Math.round((brutoCalculado / 7) * 100) / 100)
    }, [])

    const handleDailySalaryChange = useCallback((value: number) => {
        setActiveInput('diario')
        setDailySalary(value)
        const brutoCalculado = value * 7
        setWeeklySalaryBruto(Math.round(brutoCalculado * 100) / 100)
        const netoCalculado = calcularNetoDesdebruto(brutoCalculado)
        setWeeklySalaryNeto(Math.round(netoCalculado * 100) / 100)
    }, [])

    const handleHourlyRateChange = useCallback((value: number) => {
        setFormData((prev) => {
            const workPortion = value * prev.weekly_scheduled_hours
            const bruto = Math.round(workPortion * (7 / 6) * 100) / 100
            setWeeklySalaryBruto(bruto)
            setWeeklySalaryNeto(Math.round(calcularNetoDesdebruto(bruto) * 100) / 100)
            setDailySalary(Math.round((bruto / 7) * 100) / 100)
            return { ...prev, hourly_rate: value }
        })
    }, [])

    const handleWeeklyHoursChange = useCallback((value: number) => {
        setFormData((prev) => ({ ...prev, weekly_scheduled_hours: value }))
    }, [])

    const handleEffectiveFromChange = useCallback((value: string) => {
        setFormData((prev) => ({ ...prev, effective_from: value }))
    }, [])

    const handleNotesChange = useCallback((value: string) => {
        setFormData((prev) => ({ ...prev, notes: value }))
    }, [])

    // ─── Actualizar hourly_rate cuando cambia bruto o horas ────────────────────

    useEffect(() => {
        if (formData.weekly_scheduled_hours > 0 && weeklySalaryBruto > 0) {
            const workPortion = weeklySalaryBruto * (6 / 7)
            const hourlyRate = workPortion / formData.weekly_scheduled_hours
            setFormData((prev) => ({ ...prev, hourly_rate: Math.round(hourlyRate * 100) / 100 }))
        }
    }, [weeklySalaryBruto, formData.weekly_scheduled_hours])

    // ─── Validación ────────────────────────────────────────────────────────────

    const validate = useCallback((): boolean => {
        const newErrors: Partial<Record<keyof CreateWageData, string>> = {}
        let weeklySalaryErr = ''

        if (!weeklySalaryBruto || weeklySalaryBruto <= 0) {
            weeklySalaryErr = 'Ingresa el sueldo semanal (bruto o neto)'
        }

        if (!formData.weekly_scheduled_hours || formData.weekly_scheduled_hours <= 0) {
            newErrors.weekly_scheduled_hours = 'Indica las horas de la jornada semanal'
        } else if (formData.weekly_scheduled_hours > 60) {
            newErrors.weekly_scheduled_hours = 'La jornada no puede exceder 60 horas por semana'
        }

        if (!formData.hourly_rate || formData.hourly_rate <= 0) {
            newErrors.hourly_rate = 'Captura un sueldo y horas válidos para calcular la tarifa'
        }

        if (!formData.effective_from) {
            newErrors.effective_from = 'Selecciona la fecha de inicio'
        } else {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/
            if (!dateRegex.test(formData.effective_from)) {
                newErrors.effective_from = 'Formato de fecha inválido'
            }
        }

        setWeeklySalaryError(weeklySalaryErr)
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0 && weeklySalaryErr === ''
    }, [weeklySalaryBruto, formData])

    // ─── Obtener datos para submit ─────────────────────────────────────────────

    const getSubmitData = useCallback((): CreateWageData => ({
        ...formData,
        notes: formData.notes || null,
    }), [formData])

    return {
        // State
        formData,
        weeklySalaryBruto,
        weeklySalaryNeto,
        dailySalary,
        activeInput,
        errors,
        weeklySalaryError,
        // Actions
        handleBrutoChange,
        handleNetoChange,
        handleDailySalaryChange,
        handleHourlyRateChange,
        handleWeeklyHoursChange,
        handleEffectiveFromChange,
        handleNotesChange,
        validate,
        getSubmitData,
    }
}
