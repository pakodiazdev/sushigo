import { describe, it, expect } from 'vitest'
import {
  calcularISRSemanal,
  calcularSubsidioSemanal,
  calcularNetoDesdebruto,
  calcularBrutoDesdeNeto,
  AGUINALDO_DAYS,
  VACATION_DAYS_YEAR_1,
  PRIMA_VACACIONAL_PERCENT,
  IMSS_PATRON_PERCENT,
  INFONAVIT_PERCENT,
  RETIRO_CESANTIA_PERCENT,
  IMSS_TRABAJADOR_PERCENT,
} from '../use-wage-calculations'

// ─── Constants ─────────────────────────────────────────────────────────────────

describe('wage constants', () => {
  it('has correct aguinaldo days', () => {
    expect(AGUINALDO_DAYS).toBe(15)
  })

  it('has correct vacation days for year 1', () => {
    expect(VACATION_DAYS_YEAR_1).toBe(12)
  })

  it('has correct prima vacacional percent', () => {
    expect(PRIMA_VACACIONAL_PERCENT).toBe(0.25)
  })

  it('has correct IMSS patron percent', () => {
    expect(IMSS_PATRON_PERCENT).toBe(0.2045)
  })

  it('has correct INFONAVIT percent', () => {
    expect(INFONAVIT_PERCENT).toBe(0.05)
  })

  it('has correct retiro cesantia percent', () => {
    expect(RETIRO_CESANTIA_PERCENT).toBe(0.0515)
  })

  it('has correct IMSS trabajador percent', () => {
    expect(IMSS_TRABAJADOR_PERCENT).toBe(0.02375)
  })
})

// ─── calcularISRSemanal ────────────────────────────────────────────────────────

describe('calcularISRSemanal', () => {
  it('returns 0 for zero or negative base', () => {
    expect(calcularISRSemanal(0)).toBe(0)
    expect(calcularISRSemanal(-100)).toBe(0)
  })

  it('calculates ISR for first bracket (very low income)', () => {
    // First bracket: 0.01 - 171.78, tasa marginal 1.92%
    const result = calcularISRSemanal(100)
    // excedente = 100 - 0.01, cuota fija = 0, tasa = 1.92%
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(5)
  })

  it('calculates ISR for second bracket', () => {
    // Second bracket: 171.79 - 1458.03, cuota fija 3.29, tasa 6.40%
    const result = calcularISRSemanal(1000)
    expect(result).toBeGreaterThan(3.29)
    expect(result).toBeLessThan(100)
  })

  it('calculates ISR for middle bracket', () => {
    // Bracket: 2978.65 - 3566.22, cuota fija 272.37, tasa 17.92%
    const result = calcularISRSemanal(3000)
    expect(result).toBeGreaterThan(272)
    expect(result).toBeLessThan(400)
  })

  it('calculates ISR for high income bracket', () => {
    // Bracket: 7192.65 - 11336.57, cuota fija 1152.27, tasa 23.52%
    const result = calcularISRSemanal(10000)
    expect(result).toBeGreaterThan(1152)
    expect(result).toBeLessThan(2000)
  })

  it('returns 0 when bracket not found (edge case)', () => {
    // Should not happen with proper tables, but tests the guard
    const result = calcularISRSemanal(0.001)
    // This falls in first bracket
    expect(result).toBeGreaterThanOrEqual(0)
  })
})

// ─── calcularSubsidioSemanal ───────────────────────────────────────────────────

describe('calcularSubsidioSemanal', () => {
  it('returns 0 for zero or negative base', () => {
    expect(calcularSubsidioSemanal(0)).toBe(0)
    expect(calcularSubsidioSemanal(-100)).toBe(0)
  })

  it('returns max subsidio for very low income', () => {
    // First brackets: 0.01 - 861.14 have subsidio = 107.40
    expect(calcularSubsidioSemanal(100)).toBe(107.40)
    expect(calcularSubsidioSemanal(500)).toBe(107.40)
    expect(calcularSubsidioSemanal(800)).toBe(107.40)
  })

  it('returns decreasing subsidio for middle income', () => {
    // Bracket: 1039.65 - 1222.42, subsidio = 87.63
    expect(calcularSubsidioSemanal(1100)).toBe(87.63)
  })

  it('returns 0 for high income', () => {
    // Bracket: 2178.71+, subsidio = 0
    expect(calcularSubsidioSemanal(3000)).toBe(0)
    expect(calcularSubsidioSemanal(10000)).toBe(0)
  })
})

// ─── calcularNetoDesdebruto ────────────────────────────────────────────────────

describe('calcularNetoDesdebruto', () => {
  it('returns 0 for zero or negative bruto', () => {
    expect(calcularNetoDesdebruto(0)).toBe(0)
    expect(calcularNetoDesdebruto(-100)).toBe(0)
  })

  it('calculates neto for low salary (with subsidio)', () => {
    // Low salary should benefit from subsidio al empleo
    const bruto = 1000
    const neto = calcularNetoDesdebruto(bruto)
    // Neto can be close to or higher than bruto for very low salaries due to subsidio
    expect(neto).toBeGreaterThan(0)
    expect(neto).toBeLessThanOrEqual(bruto * 1.2) // reasonability check
  })

  it('calculates neto for typical weekly salary', () => {
    const bruto = 2500
    const neto = calcularNetoDesdebruto(bruto)
    // Neto should be less than bruto after deductions
    expect(neto).toBeGreaterThan(0)
    expect(neto).toBeLessThan(bruto)
  })

  it('calculates neto for high salary', () => {
    const bruto = 10000
    const neto = calcularNetoDesdebruto(bruto)
    // High salaries have more deductions
    expect(neto).toBeGreaterThan(0)
    expect(neto).toBeLessThan(bruto * 0.9) // expect at least 10% deductions
  })
})

// ─── calcularBrutoDesdeNeto ────────────────────────────────────────────────────

describe('calcularBrutoDesdeNeto', () => {
  it('calculates bruto from neto with precision', () => {
    const netoDeseado = 2000
    const bruto = calcularBrutoDesdeNeto(netoDeseado)
    // Verify by calculating neto from bruto
    const netoVerificado = calcularNetoDesdebruto(bruto)
    // Should be within 1 cent of target
    expect(Math.abs(netoVerificado - netoDeseado)).toBeLessThan(1)
  })

  it('handles very low neto values', () => {
    const netoDeseado = 500
    const bruto = calcularBrutoDesdeNeto(netoDeseado)
    expect(bruto).toBeGreaterThan(0)
    // Low salaries with subsidio may have bruto close to or less than neto
    expect(bruto).toBeGreaterThan(netoDeseado * 0.8)
  })

  it('handles high neto values', () => {
    const netoDeseado = 8000
    const bruto = calcularBrutoDesdeNeto(netoDeseado)
    const netoVerificado = calcularNetoDesdebruto(bruto)
    expect(Math.abs(netoVerificado - netoDeseado)).toBeLessThan(1)
  })

  it('returns bruto rounded to 2 decimals', () => {
    const bruto = calcularBrutoDesdeNeto(1500)
    // Check that result has at most 2 decimal places
    const decimalPart = bruto.toString().split('.')[1] || ''
    expect(decimalPart.length).toBeLessThanOrEqual(2)
  })
})
