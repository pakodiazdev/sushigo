import { describe, it, expect } from 'vitest'
import {
  CashRegisterType,
  SessionStatus,
  AdjustmentType,
  Direction,
  TenderType,
} from '../cash'

describe('CashRegisterType enum', () => {
  it('has ON_PREMISE value', () => {
    expect(CashRegisterType.ON_PREMISE).toBe('ON_PREMISE')
  })

  it('has DELIVERY value', () => {
    expect(CashRegisterType.DELIVERY).toBe('DELIVERY')
  })

  it('has EVENT value', () => {
    expect(CashRegisterType.EVENT).toBe('EVENT')
  })

  it('has 3 values total', () => {
    const values = Object.values(CashRegisterType).filter((v) => typeof v === 'string')
    expect(values).toHaveLength(3)
  })
})

describe('SessionStatus enum', () => {
  it('has DRAFT value', () => {
    expect(SessionStatus.DRAFT).toBe('DRAFT')
  })

  it('has POSTED value', () => {
    expect(SessionStatus.POSTED).toBe('POSTED')
  })

  it('has 2 values total', () => {
    const values = Object.values(SessionStatus).filter((v) => typeof v === 'string')
    expect(values).toHaveLength(2)
  })
})

describe('AdjustmentType enum', () => {
  it('has EXTERNAL_IMPORT value', () => {
    expect(AdjustmentType.EXTERNAL_IMPORT).toBe('EXTERNAL_IMPORT')
  })

  it('has CORRECTION value', () => {
    expect(AdjustmentType.CORRECTION).toBe('CORRECTION')
  })

  it('has 2 values total', () => {
    const values = Object.values(AdjustmentType).filter((v) => typeof v === 'string')
    expect(values).toHaveLength(2)
  })
})

describe('Direction enum', () => {
  it('has INFLOW value', () => {
    expect(Direction.INFLOW).toBe('INFLOW')
  })

  it('has OUTFLOW value', () => {
    expect(Direction.OUTFLOW).toBe('OUTFLOW')
  })

  it('has 2 values total', () => {
    const values = Object.values(Direction).filter((v) => typeof v === 'string')
    expect(values).toHaveLength(2)
  })
})

describe('TenderType enum', () => {
  it('has CASH value', () => {
    expect(TenderType.CASH).toBe('CASH')
  })

  it('has CARD value', () => {
    expect(TenderType.CARD).toBe('CARD')
  })

  it('has TRANSFER value', () => {
    expect(TenderType.TRANSFER).toBe('TRANSFER')
  })

  it('has 3 values total', () => {
    const values = Object.values(TenderType).filter((v) => typeof v === 'string')
    expect(values).toHaveLength(3)
  })
})
