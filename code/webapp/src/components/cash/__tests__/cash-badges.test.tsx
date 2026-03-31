/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import {
  CashRegisterTypeBadge,
  SessionStatusBadge,
  TenderTypeBadge,
  AdjustmentTypeBadge,
} from '../cash-utils'
import { CashRegisterType, SessionStatus, TenderType, AdjustmentType, Direction } from '@/types/cash'

afterEach(() => {
  cleanup()
})

describe('CashRegisterTypeBadge', () => {
  it('renders "Local" for ON_PREMISE type', () => {
    const { getByText } = render(<CashRegisterTypeBadge type={CashRegisterType.ON_PREMISE} />)
    expect(getByText('Local')).toBeDefined()
  })

  it('renders "Delivery" for DELIVERY type', () => {
    const { getByText } = render(<CashRegisterTypeBadge type={CashRegisterType.DELIVERY} />)
    expect(getByText('Delivery')).toBeDefined()
  })

  it('renders "Evento" for EVENT type', () => {
    const { getByText } = render(<CashRegisterTypeBadge type={CashRegisterType.EVENT} />)
    expect(getByText('Evento')).toBeDefined()
  })

  it('applies custom className', () => {
    const { container } = render(
      <CashRegisterTypeBadge type={CashRegisterType.ON_PREMISE} className="custom-class" />
    )
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('custom-class')
  })
})

describe('SessionStatusBadge', () => {
  it('renders "En proceso" for DRAFT status', () => {
    const { getByText } = render(<SessionStatusBadge status={SessionStatus.DRAFT} />)
    expect(getByText('En proceso')).toBeDefined()
  })

  it('renders "Cerrada" for POSTED status', () => {
    const { getByText } = render(<SessionStatusBadge status={SessionStatus.POSTED} />)
    expect(getByText('Cerrada')).toBeDefined()
  })

  it('applies custom className', () => {
    const { container } = render(
      <SessionStatusBadge status={SessionStatus.DRAFT} className="custom-class" />
    )
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('custom-class')
  })
})

describe('TenderTypeBadge', () => {
  it('renders "Efectivo" for CASH type', () => {
    const { getByText } = render(<TenderTypeBadge type={TenderType.CASH} />)
    expect(getByText('Efectivo')).toBeDefined()
  })

  it('renders "Tarjeta" for CARD type', () => {
    const { getByText } = render(<TenderTypeBadge type={TenderType.CARD} />)
    expect(getByText('Tarjeta')).toBeDefined()
  })

  it('renders "Transferencia" for TRANSFER type', () => {
    const { getByText } = render(<TenderTypeBadge type={TenderType.TRANSFER} />)
    expect(getByText('Transferencia')).toBeDefined()
  })

  it('applies custom className', () => {
    const { container } = render(
      <TenderTypeBadge type={TenderType.CASH} className="custom-class" />
    )
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('custom-class')
  })
})

describe('AdjustmentTypeBadge', () => {
  describe('EXTERNAL_IMPORT type', () => {
    it('renders "Importación Externa (Ingreso)" for INFLOW direction', () => {
      const { getByText } = render(
        <AdjustmentTypeBadge type={AdjustmentType.EXTERNAL_IMPORT} direction={Direction.INFLOW} />
      )
      expect(getByText('Importación Externa (Ingreso)')).toBeDefined()
    })

    it('renders "Importación Externa (Egreso)" for OUTFLOW direction', () => {
      const { getByText } = render(
        <AdjustmentTypeBadge type={AdjustmentType.EXTERNAL_IMPORT} direction={Direction.OUTFLOW} />
      )
      expect(getByText('Importación Externa (Egreso)')).toBeDefined()
    })
  })

  describe('CORRECTION type', () => {
    it('renders "Corrección (Ingreso)" for INFLOW direction', () => {
      const { getByText } = render(
        <AdjustmentTypeBadge type={AdjustmentType.CORRECTION} direction={Direction.INFLOW} />
      )
      expect(getByText('Corrección (Ingreso)')).toBeDefined()
    })

    it('renders "Corrección (Egreso)" for OUTFLOW direction', () => {
      const { getByText } = render(
        <AdjustmentTypeBadge type={AdjustmentType.CORRECTION} direction={Direction.OUTFLOW} />
      )
      expect(getByText('Corrección (Egreso)')).toBeDefined()
    })
  })

  it('applies custom className', () => {
    const { container } = render(
      <AdjustmentTypeBadge 
        type={AdjustmentType.CORRECTION} 
        direction={Direction.INFLOW} 
        className="custom-class" 
      />
    )
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('custom-class')
  })
})
