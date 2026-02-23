import { useMemo } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES LFT MÉXICO
// ═══════════════════════════════════════════════════════════════════════════

export const AGUINALDO_DAYS = 15 // Días mínimos de aguinaldo por ley
export const VACATION_DAYS_YEAR_1 = 12 // Días de vacaciones primer año (reforma 2023)
export const PRIMA_VACACIONAL_PERCENT = 0.25 // 25% prima vacacional
export const DAYS_PER_YEAR = 365

// Cuotas patronales aproximadas (% sobre SDI)
export const IMSS_PATRON_PERCENT = 0.2045 // ~20.45%
export const INFONAVIT_PERCENT = 0.05 // 5%
export const RETIRO_CESANTIA_PERCENT = 0.0515 // 5.15%

// Cuotas IMSS del trabajador (% sobre SDI)
export const IMSS_TRABAJADOR_PERCENT = 0.02375 // ~2.375%

// ═══════════════════════════════════════════════════════════════════════════
// TABLAS ISR Y SUBSIDIO AL EMPLEO
// ═══════════════════════════════════════════════════════════════════════════

interface ISRBracket {
    limiteInferior: number
    limiteSuperior: number
    cuotaFija: number
    tasaMarginal: number
}

const TABLA_ISR_SEMANAL: ISRBracket[] = [
    { limiteInferior: 0.01, limiteSuperior: 171.78, cuotaFija: 0, tasaMarginal: 0.0192 },
    { limiteInferior: 171.79, limiteSuperior: 1458.03, cuotaFija: 3.29, tasaMarginal: 0.0640 },
    { limiteInferior: 1458.04, limiteSuperior: 2562.35, cuotaFija: 85.61, tasaMarginal: 0.1088 },
    { limiteInferior: 2562.36, limiteSuperior: 2978.64, cuotaFija: 205.80, tasaMarginal: 0.16 },
    { limiteInferior: 2978.65, limiteSuperior: 3566.22, cuotaFija: 272.37, tasaMarginal: 0.1792 },
    { limiteInferior: 3566.23, limiteSuperior: 7192.64, cuotaFija: 377.65, tasaMarginal: 0.2136 },
    { limiteInferior: 7192.65, limiteSuperior: 11336.57, cuotaFija: 1152.27, tasaMarginal: 0.2352 },
    { limiteInferior: 11336.58, limiteSuperior: 21643.30, cuotaFija: 2127.01, tasaMarginal: 0.30 },
    { limiteInferior: 21643.31, limiteSuperior: 28857.78, cuotaFija: 5219.03, tasaMarginal: 0.32 },
    { limiteInferior: 28857.79, limiteSuperior: 86573.34, cuotaFija: 7527.69, tasaMarginal: 0.34 },
    { limiteInferior: 86573.35, limiteSuperior: Infinity, cuotaFija: 27140.97, tasaMarginal: 0.35 },
]

interface SubsidioEmpleoBracket {
    limiteInferior: number
    limiteSuperior: number
    subsidio: number
}

const TABLA_SUBSIDIO_SEMANAL: SubsidioEmpleoBracket[] = [
    { limiteInferior: 0.01, limiteSuperior: 436.05, subsidio: 107.40 },
    { limiteInferior: 436.06, limiteSuperior: 653.38, subsidio: 107.40 },
    { limiteInferior: 653.39, limiteSuperior: 861.14, subsidio: 107.40 },
    { limiteInferior: 861.15, limiteSuperior: 887.68, subsidio: 102.77 },
    { limiteInferior: 887.69, limiteSuperior: 1039.64, subsidio: 95.17 },
    { limiteInferior: 1039.65, limiteSuperior: 1222.42, subsidio: 87.63 },
    { limiteInferior: 1222.43, limiteSuperior: 1383.28, subsidio: 74.83 },
    { limiteInferior: 1383.29, limiteSuperior: 1562.81, subsidio: 66.45 },
    { limiteInferior: 1562.82, limiteSuperior: 1772.46, subsidio: 54.86 },
    { limiteInferior: 1772.47, limiteSuperior: 1914.58, subsidio: 39.40 },
    { limiteInferior: 1914.59, limiteSuperior: 2178.70, subsidio: 25.84 },
    { limiteInferior: 2178.71, limiteSuperior: Infinity, subsidio: 0 },
]

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE CÁLCULO
// ═══════════════════════════════════════════════════════════════════════════

export function calcularISRSemanal(baseGravable: number): number {
    if (baseGravable <= 0) return 0

    const bracket = TABLA_ISR_SEMANAL.find(
        b => baseGravable >= b.limiteInferior && baseGravable <= b.limiteSuperior
    )

    if (!bracket) return 0

    const excedente = baseGravable - bracket.limiteInferior
    return bracket.cuotaFija + (excedente * bracket.tasaMarginal)
}

export function calcularSubsidioSemanal(baseGravable: number): number {
    if (baseGravable <= 0) return 0

    const bracket = TABLA_SUBSIDIO_SEMANAL.find(
        b => baseGravable >= b.limiteInferior && baseGravable <= b.limiteSuperior
    )

    return bracket?.subsidio ?? 0
}

/**
 * Calcula el salario neto desde el bruto
 */
export function calcularNetoDesdebruto(bruto: number): number {
    if (bruto <= 0) return 0
    const sdi = (bruto / 7) * 1.0493
    const sdiSemanal = sdi * 7
    const imssEmpleado = sdiSemanal * IMSS_TRABAJADOR_PERCENT
    const isrBruto = calcularISRSemanal(bruto)
    const subsidio = calcularSubsidioSemanal(bruto)
    const isrNeto = Math.max(0, isrBruto - subsidio)
    const subsidioAPagar = subsidio > isrBruto ? subsidio - isrBruto : 0
    return bruto - imssEmpleado - isrNeto + subsidioAPagar
}

/**
 * Calcula bruto desde neto (aproximación iterativa)
 */
export function calcularBrutoDesdeNeto(netoDeseado: number): number {
    let brutoEstimado = netoDeseado * 1.15

    for (let i = 0; i < 10; i++) {
        const netoCalculado = calcularNetoDesdebruto(brutoEstimado)
        const diferencia = netoDeseado - netoCalculado
        if (Math.abs(diferencia) < 0.01) break
        brutoEstimado += diferencia
    }

    return Math.round(brutoEstimado * 100) / 100
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface WageCalculations {
    // Desglose semanal
    dailyWork: number
    dailySalary: number
    avgDailyHours: number
    weeklyWorkPortion: number
    weeklyRestPortion: number
    weeklyTotal: number
    monthlyTotal: number
    annualTotal: number
    hourlyRatePrecise: number
    // LFT
    aguinaldoAnnual: number
    primaVacacionalAnnual: number
    factorIntegracion: number
    sdi: number
    // Costo empresa
    sdiMensual: number
    imssPatronMensual: number
    infonavitMensual: number
    retiroCesantiaMensual: number
    totalCuotasPatronalesMensual: number
    porcentajeCuotasPatronales: number
    costoDiarioEmpresa: number
    costoSemanalEmpresa: number
    costoMensualEmpresa: number
    costoAnualEmpresa: number
    // Deducciones del trabajador
    imssEmpleadoSemanal: number
    isrBrutoSemanal: number
    subsidioEmpleoSemanal: number
    isrNetoSemanal: number
    subsidioAPagar: number
    totalDeduccionesSemanal: number
    sueldoNetoSemanal: number
    totalDeduccionesMensual: number
    sueldoNetoMensual: number
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

interface UseWageCalculationsParams {
    weeklySalary: number
    weeklyHours: number
}

export function useWageCalculations({ weeklySalary, weeklyHours }: UseWageCalculationsParams): WageCalculations | null {
    return useMemo(() => {
        if (weeklySalary <= 0 || weeklyHours <= 0) return null

        const weeksPerYear = 52.1429
        const weeklyTotal = weeklySalary
        const weeklyWorkPortion = weeklySalary * (6 / 7)
        const weeklyRestPortion = weeklySalary * (1 / 7)
        const dailySalary = weeklyTotal / 7
        const avgDailyHours = weeklyHours / 6
        const dailyWork = weeklyWorkPortion / 6
        const monthlyTotal = weeklyTotal * (weeksPerYear / 12)
        const annualTotal = weeklyTotal * weeksPerYear
        const hourlyRatePrecise = weeklyHours > 0 ? weeklyWorkPortion / weeklyHours : 0

        // LFT
        const aguinaldoAnnual = dailySalary * AGUINALDO_DAYS
        const primaVacacionalAnnual = dailySalary * VACATION_DAYS_YEAR_1 * PRIMA_VACACIONAL_PERCENT
        const factorAguinaldo = AGUINALDO_DAYS / DAYS_PER_YEAR
        const factorPrimaVacacional = (VACATION_DAYS_YEAR_1 * PRIMA_VACACIONAL_PERCENT) / DAYS_PER_YEAR
        const factorIntegracion = 1 + factorAguinaldo + factorPrimaVacacional
        const sdi = dailySalary * factorIntegracion

        // Costo empresa
        const sdiMensual = sdi * 30.4
        const imssPatronMensual = sdiMensual * IMSS_PATRON_PERCENT
        const infonavitMensual = sdiMensual * INFONAVIT_PERCENT
        const retiroCesantiaMensual = sdiMensual * RETIRO_CESANTIA_PERCENT
        const totalCuotasPatronalesMensual = imssPatronMensual + infonavitMensual + retiroCesantiaMensual
        const porcentajeCuotasPatronales = (IMSS_PATRON_PERCENT + INFONAVIT_PERCENT + RETIRO_CESANTIA_PERCENT) * 100
        const costoMensualEmpresa = monthlyTotal + totalCuotasPatronalesMensual + (aguinaldoAnnual / 12) + (primaVacacionalAnnual / 12)
        const costoAnualEmpresa = annualTotal + aguinaldoAnnual + primaVacacionalAnnual + (totalCuotasPatronalesMensual * 12)
        const costoSemanalEmpresa = costoMensualEmpresa / (weeksPerYear / 12)
        const costoDiarioEmpresa = costoSemanalEmpresa / 7

        // Deducciones trabajador
        const sdiSemanal = sdi * 7
        const imssEmpleadoSemanal = sdiSemanal * IMSS_TRABAJADOR_PERCENT
        const isrBrutoSemanal = calcularISRSemanal(weeklyTotal)
        const subsidioEmpleoSemanal = calcularSubsidioSemanal(weeklyTotal)
        const isrNetoSemanal = Math.max(0, isrBrutoSemanal - subsidioEmpleoSemanal)
        const subsidioAPagar = subsidioEmpleoSemanal > isrBrutoSemanal
            ? subsidioEmpleoSemanal - isrBrutoSemanal
            : 0
        const totalDeduccionesSemanal = imssEmpleadoSemanal + isrNetoSemanal
        const sueldoNetoSemanal = weeklyTotal - totalDeduccionesSemanal + subsidioAPagar
        const totalDeduccionesMensual = totalDeduccionesSemanal * (weeksPerYear / 12)
        const sueldoNetoMensual = sueldoNetoSemanal * (weeksPerYear / 12)

        return {
            dailyWork,
            dailySalary,
            avgDailyHours,
            weeklyWorkPortion,
            weeklyRestPortion,
            weeklyTotal,
            monthlyTotal,
            annualTotal,
            hourlyRatePrecise,
            aguinaldoAnnual,
            primaVacacionalAnnual,
            factorIntegracion,
            sdi,
            sdiMensual,
            imssPatronMensual,
            infonavitMensual,
            retiroCesantiaMensual,
            totalCuotasPatronalesMensual,
            porcentajeCuotasPatronales,
            costoDiarioEmpresa,
            costoSemanalEmpresa,
            costoMensualEmpresa,
            costoAnualEmpresa,
            imssEmpleadoSemanal,
            isrBrutoSemanal,
            subsidioEmpleoSemanal,
            isrNetoSemanal,
            subsidioAPagar,
            totalDeduccionesSemanal,
            sueldoNetoSemanal,
            totalDeduccionesMensual,
            sueldoNetoMensual,
        }
    }, [weeklySalary, weeklyHours])
}
