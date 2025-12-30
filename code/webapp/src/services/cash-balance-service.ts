/**
 * Cash Balance Service
 *
 * Centraliza la lógica de cálculo de saldos de sesiones de caja
 */

import { CashSession, SessionSummary } from '@/types/cash'

/**
 * Calcula el saldo actual de una sesión de caja
 * Fórmula: Saldo Actual = Fondo Inicial + Ingresos - Egresos
 *
 * @param session - Sesión de caja
 * @param summary - Resumen con totales de ingresos y egresos
 * @returns Saldo actual como string con 2 decimales
 */
export function calculateCurrentBalance(
  session: CashSession,
  summary?: SessionSummary
): string {
  // Si no hay summary, retornar el fondo inicial
  if (!summary) {
    console.log('[calculateCurrentBalance] No summary, using opening balance:', session.opening_balance)
    return session.opening_balance || '0.00'
  }

  // Si el backend ya calculó el saldo actual, usarlo
  if (summary.current_balance) {
    console.log('[calculateCurrentBalance] Using backend current_balance:', summary.current_balance)
    return summary.current_balance
  }

  // Caso fallback: calcular manualmente
  const opening = parseFloat(session.opening_balance || '0')
  const incomes = parseFloat(summary.total_incomes || '0')
  const expenses = parseFloat(summary.total_expenses || '0')

  console.log('[calculateCurrentBalance] Manual calculation:', {
    opening,
    incomes,
    expenses,
    result: opening + incomes - expenses
  })

  const currentBalance = opening + incomes - expenses

  return currentBalance.toFixed(2)
}

/**
 * Calcula el saldo esperado de cierre (solo transacciones finalizadas)
 *
 * @param session - Sesión de caja
 * @returns Saldo esperado de cierre
 */
export function calculateExpectedClosingBalance(session: CashSession): string {
  // Este cálculo se debe hacer solo con transacciones POSTED
  // Por ahora retornamos el closing_balance que viene del backend
  return session.closing_balance || session.opening_balance || '0.00'
}

/**
 * Calcula la variación entre el saldo actual y el esperado
 *
 * @param currentBalance - Saldo actual
 * @param expectedBalance - Saldo esperado
 * @returns Variación (puede ser positiva o negativa)
 */
export function calculateVariance(
  currentBalance: string,
  expectedBalance: string
): number {
  const current = parseFloat(currentBalance)
  const expected = parseFloat(expectedBalance)

  return current - expected
}

/**
 * Formatea un monto como moneda MXN
 *
 * @param amount - Monto a formatear
 * @returns Monto formateado como "$1,234.56"
 */
export function formatCurrency(amount: string | number): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(numericAmount)) {
    return '$0.00'
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount)
}

/**
 * Determina si hay una diferencia significativa en el saldo
 *
 * @param variance - Variación calculada
 * @param threshold - Umbral de tolerancia (default: 0.01)
 * @returns true si la diferencia es significativa
 */
export function hasSignificantVariance(
  variance: number,
  threshold: number = 0.01
): boolean {
  return Math.abs(variance) > threshold
}

/**
 * Obtiene el tipo de variación
 *
 * @param variance - Variación calculada
 * @returns 'surplus' | 'shortage' | 'balanced'
 */
export function getVarianceType(
  variance: number
): 'surplus' | 'shortage' | 'balanced' {
  if (variance > 0.01) return 'surplus' // Sobrante
  if (variance < -0.01) return 'shortage' // Faltante
  return 'balanced' // Cuadrado
}
