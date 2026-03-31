/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { DayLabel } from '../day-label'

afterEach(() => {
  cleanup()
})

describe('DayLabel', () => {
  it('renders label text', () => {
    const { container } = render(
      <DayLabel
        label="Lunes"
        hasTemporaryOverride={false}
        hasPermanentOverride={false}
      />
    )
    expect(container.textContent).toContain('Lunes')
  })

  it('shows no indicator when no overrides', () => {
    const { container } = render(
      <DayLabel
        label="Martes"
        hasTemporaryOverride={false}
        hasPermanentOverride={false}
      />
    )
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('shows zap icon when hasTemporaryOverride is true', () => {
    const { container } = render(
      <DayLabel
        label="Miércoles"
        hasTemporaryOverride={true}
        hasPermanentOverride={false}
      />
    )
    // Zap icon should be present
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('shows dot when hasPermanentOverride is true and no temporary', () => {
    const { container } = render(
      <DayLabel
        label="Jueves"
        hasTemporaryOverride={false}
        hasPermanentOverride={true}
      />
    )
    // Dot indicator should be present (span with rounded-full)
    const dot = container.querySelector('.rounded-full')
    expect(dot).not.toBeNull()
  })

  it('shows zap instead of dot when both overrides are true', () => {
    const { container } = render(
      <DayLabel
        label="Viernes"
        hasTemporaryOverride={true}
        hasPermanentOverride={true}
      />
    )
    // Temporary takes priority, so zap should show
    const svg = container.querySelector('svg')
    const dot = container.querySelector('.rounded-full')
    expect(svg).not.toBeNull()
    expect(dot).toBeNull()
  })

  it('renders zap as button when onClickOverride is provided with temporary', () => {
    const onClick = vi.fn()
    const { container } = render(
      <DayLabel
        label="Sábado"
        hasTemporaryOverride={true}
        hasPermanentOverride={false}
        onClickOverride={onClick}
      />
    )
    const button = container.querySelector('button')
    expect(button).not.toBeNull()
    fireEvent.click(button!)
    expect(onClick).toHaveBeenCalled()
  })

  it('renders dot as button when onClickOverride is provided with permanent', () => {
    const onClick = vi.fn()
    const { container } = render(
      <DayLabel
        label="Domingo"
        hasTemporaryOverride={false}
        hasPermanentOverride={true}
        onClickOverride={onClick}
      />
    )
    const button = container.querySelector('button')
    expect(button).not.toBeNull()
    fireEvent.click(button!)
    expect(onClick).toHaveBeenCalled()
  })

  it('does not render clickable icons when no onClickOverride', () => {
    const { container } = render(
      <DayLabel
        label="Test"
        hasTemporaryOverride={true}
        hasPermanentOverride={false}
      />
    )
    // Should be span, not button
    const button = container.querySelector('button')
    expect(button).toBeNull()
  })
})
