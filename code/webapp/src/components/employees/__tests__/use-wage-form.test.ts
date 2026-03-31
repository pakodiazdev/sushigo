/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useWageForm } from '../use-wage-form'

afterEach(() => {
  cleanup()
})

describe('useWageForm', () => {
  describe('initial state', () => {
    it('initializes with default weekly_scheduled_hours of 48', () => {
      const { result } = renderHook(() => useWageForm())
      expect(result.current.formData.weekly_scheduled_hours).toBe(48)
    })

    it('initializes with zero hourly_rate', () => {
      const { result } = renderHook(() => useWageForm())
      expect(result.current.formData.hourly_rate).toBe(0)
    })

    it('initializes with today date for effective_from', () => {
      const { result } = renderHook(() => useWageForm())
      const today = new Date().toISOString().split('T')[0]
      expect(result.current.formData.effective_from).toBe(today)
    })

    it('initializes with empty notes', () => {
      const { result } = renderHook(() => useWageForm())
      expect(result.current.formData.notes).toBe('')
    })

    it('initializes with zero weekly salary bruto', () => {
      const { result } = renderHook(() => useWageForm())
      expect(result.current.weeklySalaryBruto).toBe(0)
    })

    it('initializes with zero weekly salary neto', () => {
      const { result } = renderHook(() => useWageForm())
      expect(result.current.weeklySalaryNeto).toBe(0)
    })

    it('initializes with null activeInput', () => {
      const { result } = renderHook(() => useWageForm())
      expect(result.current.activeInput).toBeNull()
    })
  })

  describe('handleBrutoChange', () => {
    it('updates weeklySalaryBruto', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleBrutoChange(1000)
      })

      expect(result.current.weeklySalaryBruto).toBe(1000)
    })

    it('sets activeInput to bruto', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleBrutoChange(1000)
      })

      expect(result.current.activeInput).toBe('bruto')
    })

    it('calculates weeklySalaryNeto from bruto', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleBrutoChange(1000)
      })

      // Neto is calculated based on bruto
      expect(result.current.weeklySalaryNeto).toBeGreaterThan(0)
    })

    it('calculates dailySalary as bruto divided by 7', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleBrutoChange(700)
      })

      expect(result.current.dailySalary).toBe(100)
    })
  })

  describe('handleNetoChange', () => {
    it('updates weeklySalaryNeto', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleNetoChange(900)
      })

      expect(result.current.weeklySalaryNeto).toBe(900)
    })

    it('sets activeInput to neto', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleNetoChange(900)
      })

      expect(result.current.activeInput).toBe('neto')
    })

    it('calculates weeklySalaryBruto from neto', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleNetoChange(900)
      })

      // Bruto is calculated based on neto  
      expect(result.current.weeklySalaryBruto).toBeGreaterThan(0)
    })
  })

  describe('handleDailySalaryChange', () => {
    it('updates dailySalary', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleDailySalaryChange(100)
      })

      expect(result.current.dailySalary).toBe(100)
    })

    it('sets activeInput to diario', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleDailySalaryChange(100)
      })

      expect(result.current.activeInput).toBe('diario')
    })

    it('calculates weeklySalaryBruto as daily times 7', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleDailySalaryChange(100)
      })

      expect(result.current.weeklySalaryBruto).toBe(700)
    })
  })

  describe('handleWeeklyHoursChange', () => {
    it('updates weekly_scheduled_hours', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleWeeklyHoursChange(40)
      })

      expect(result.current.formData.weekly_scheduled_hours).toBe(40)
    })
  })

  describe('handleEffectiveFromChange', () => {
    it('updates effective_from', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleEffectiveFromChange('2024-06-15')
      })

      expect(result.current.formData.effective_from).toBe('2024-06-15')
    })
  })

  describe('handleNotesChange', () => {
    it('updates notes', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleNotesChange('Test notes')
      })

      expect(result.current.formData.notes).toBe('Test notes')
    })
  })

  describe('validate', () => {
    it('returns false when weeklySalaryBruto is zero', () => {
      const { result } = renderHook(() => useWageForm())
      
      let isValid = false
      act(() => {
        isValid = result.current.validate()
      })

      expect(isValid).toBe(false)
      expect(result.current.weeklySalaryError).toBe('Ingresa el sueldo semanal (bruto o neto)')
    })

    it('returns false when weekly_scheduled_hours is zero', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleBrutoChange(1000)
        result.current.handleWeeklyHoursChange(0)
      })

      let isValid = false
      act(() => {
        isValid = result.current.validate()
      })

      expect(isValid).toBe(false)
      expect(result.current.errors.weekly_scheduled_hours).toBe('Indica las horas de la jornada semanal')
    })

    it('returns false when weekly_scheduled_hours exceeds 60', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleBrutoChange(1000)
        result.current.handleWeeklyHoursChange(65)
      })

      let isValid = false
      act(() => {
        isValid = result.current.validate()
      })

      expect(isValid).toBe(false)
      expect(result.current.errors.weekly_scheduled_hours).toBe('La jornada no puede exceder 60 horas por semana')
    })

    it('returns false when effective_from is empty', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleBrutoChange(1000)
        result.current.handleEffectiveFromChange('')
      })

      let isValid = false
      act(() => {
        isValid = result.current.validate()
      })

      expect(isValid).toBe(false)
      expect(result.current.errors.effective_from).toBe('Selecciona la fecha de inicio')
    })

    it('returns true when all fields are valid', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleBrutoChange(1000)
        result.current.handleWeeklyHoursChange(48)
        result.current.handleEffectiveFromChange('2024-06-15')
      })

      let isValid = false
      act(() => {
        isValid = result.current.validate()
      })

      expect(isValid).toBe(true)
    })
  })

  describe('getSubmitData', () => {
    it('returns formData with null notes when notes is empty', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleBrutoChange(1000)
        result.current.handleWeeklyHoursChange(48)
      })

      const data = result.current.getSubmitData()
      expect(data.notes).toBeNull()
    })

    it('returns formData with notes when notes has value', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleBrutoChange(1000)
        result.current.handleNotesChange('Test note')
      })

      const data = result.current.getSubmitData()
      expect(data.notes).toBe('Test note')
    })

    it('includes hourly_rate in submit data', () => {
      const { result } = renderHook(() => useWageForm())
      
      act(() => {
        result.current.handleBrutoChange(1000)
      })

      const data = result.current.getSubmitData()
      expect(data.hourly_rate).toBeGreaterThan(0)
    })
  })
})
