// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, act, cleanup } from '@testing-library/react'
import { nextDateForDow, detectConflicts } from '@/components/employees/use-override-scope-dialog'
import { OverrideScopeDialog } from '@/components/employees/override-scope-dialog'
import type { ScheduleDayOverride } from '@/types/schedule'

// ── OverrideScopeDialog component ─────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: string }) => (
    <button onClick={onClick} disabled={disabled} type={(type ?? 'button') as 'button' | 'submit' | 'reset'}>{children}</button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

function makeConflict(id: string, from: string, to: string | null): ScheduleDayOverride {
  return {
    id,
    employment_period_id: 'period-01',
    day_of_week: 1,
    effective_from: from,
    effective_to: to,
    is_day_off: false,
    expected_start: '09:00',
    expected_lunch_start: null,
    expected_lunch_end: null,
    lunch_duration_minutes: null,
    expected_end: '18:00',
    note: null,
    created_at: '2026-01-01T00:00:00+00:00',
    updated_at: '2026-01-01T00:00:00+00:00',
  }
}

const BASE_PROPS = {
  isOpen: true,
  dayLabel: 'Lunes',
  dayOfWeek: 1,
  existingOverrides: [] as ScheduleDayOverride[],
  isPending: false,
  isError: false,
  onSubmit: vi.fn(),
  onClose: vi.fn(),
}

/** Triggers onChange validation so react-hook-form sets isValid=true, then clicks the primary submit button. */
async function clickMainSubmit() {
  const dateInput = document.body.querySelector('#scope-effective-from') as HTMLInputElement
  await act(async () => {
    fireEvent.change(dateInput, { target: { value: dateInput.value || '2026-06-01' } })
  })
  const btn = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button'))
    .find((b) => !b.disabled && b.textContent?.includes('Guardar'))
  if (!btn) throw new Error('Submit button not found or still disabled')
  await act(async () => { fireEvent.click(btn) })
}

describe('OverrideScopeDialog', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('renders the dialog title with dayLabel', () => {
    const { getByText } = render(<OverrideScopeDialog {...BASE_PROPS} />)
    expect(getByText('Ajuste — Lunes')).toBeDefined()
  })

  it('renders all 3 scope option labels', () => {
    const { getByText } = render(<OverrideScopeDialog {...BASE_PROPS} />)
    expect(getByText('Solo esta fecha')).toBeDefined()
    expect(getByText('Rango de fechas')).toBeDefined()
    expect(getByText('De aquí en adelante')).toBeDefined()
  })

  it('shows "Fecha" label for single_date scope (default)', () => {
    render(<OverrideScopeDialog {...BASE_PROPS} />)
    expect(document.body.textContent).toContain('Fecha')
  })

  it('shows "A partir de" label for indefinite scope', async () => {
    render(<OverrideScopeDialog {...BASE_PROPS} />)
    const indefiniteRadio = document.body.querySelector('input[value="indefinite"]')!
    await act(async () => { fireEvent.click(indefiniteRadio) })
    expect(document.body.textContent).toContain('A partir de')
  })

  it('shows "A partir de" label for range scope', async () => {
    render(<OverrideScopeDialog {...BASE_PROPS} />)
    const rangeRadio = document.body.querySelector('input[value="range"]')!
    await act(async () => { fireEvent.click(rangeRadio) })
    expect(document.body.textContent).toContain('A partir de')
  })

  it('selecting range scope renders the effectiveTo input', async () => {
    render(<OverrideScopeDialog {...BASE_PROPS} />)
    const rangeRadio = document.body.querySelector('input[value="range"]')!
    await act(async () => { fireEvent.click(rangeRadio) })
    expect(document.body.querySelector('#scope-effective-to')).not.toBeNull()
  })

  it('single_date scope does not render the effectiveTo input', () => {
    render(<OverrideScopeDialog {...BASE_PROPS} />)
    expect(document.body.querySelector('#scope-effective-to')).toBeNull()
  })

  it('shows "Aplicar cambio permanente" label for indefinite scope', async () => {
    render(<OverrideScopeDialog {...BASE_PROPS} />)
    const indefiniteRadio = document.body.querySelector('input[value="indefinite"]')!
    await act(async () => { fireEvent.click(indefiniteRadio) })
    expect(document.body.textContent).toContain('Aplicar cambio permanente')
  })

  it('shows "Guardar excepción" label for non-indefinite scope', () => {
    render(<OverrideScopeDialog {...BASE_PROPS} />)
    expect(document.body.textContent).toContain('Guardar excepción')
  })

  it('shows "Guardando…" button text when isPending is true', () => {
    render(<OverrideScopeDialog {...BASE_PROPS} isPending />)
    expect(document.body.textContent).toContain('Guardando…')
  })

  it('shows error message when isError is true', () => {
    const { getByText } = render(<OverrideScopeDialog {...BASE_PROPS} isError />)
    expect(getByText('Ocurrió un error. Intenta de nuevo.')).toBeDefined()
  })

  it('clicking Cancelar button calls onClose', () => {
    const onClose = vi.fn()
    const { getByText } = render(<OverrideScopeDialog {...BASE_PROPS} onClose={onClose} />)
    fireEvent.click(getByText('Cancelar'))
    expect(onClose).toHaveBeenCalled()
  })

  it('clicking the backdrop button calls onClose', () => {
    const onClose = vi.fn()
    render(<OverrideScopeDialog {...BASE_PROPS} onClose={onClose} />)
    const backdrop = document.body.querySelector('button[aria-label="Cerrar"]')!
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking X icon button calls onClose', () => {
    const onClose = vi.fn()
    render(<OverrideScopeDialog {...BASE_PROPS} onClose={onClose} />)
    // The X button is the button that wraps the X icon (not the backdrop, not Cancel)
    const buttons = Array.from(document.body.querySelectorAll('button'))
    // backdrop has aria-label="Cerrar", Cancel has text "Cancelar", X has no text
    const xButton = buttons.find((b) => !b.getAttribute('aria-label') && b.textContent === '')
    if (xButton) {
      fireEvent.click(xButton)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('shows conflicts step when existing overrides conflict with date', async () => {
    // A permanent override starting in the past will always conflict
    const conflict = makeConflict('ovr-1', '2020-01-01', null)
    render(<OverrideScopeDialog {...BASE_PROPS} existingOverrides={[conflict]} />)
    await clickMainSubmit()
    expect(document.body.textContent).toContain('Se encontró')
  })

  it('conflicts step shows "Continuar de todos modos" button', async () => {
    const conflict = makeConflict('ovr-1', '2020-01-01', null)
    render(<OverrideScopeDialog {...BASE_PROPS} existingOverrides={[conflict]} />)
    await clickMainSubmit()
    expect(document.body.textContent).toContain('Continuar de todos modos')
  })

  it('conflicts step shows "← Volver" button to go back', async () => {
    const conflict = makeConflict('ovr-1', '2020-01-01', null)
    render(<OverrideScopeDialog {...BASE_PROPS} existingOverrides={[conflict]} />)
    await clickMainSubmit()
    const backBtn = Array.from(document.body.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Volver'))!
    await act(async () => { fireEvent.click(backBtn) })
    expect(document.body.textContent).toContain('Solo esta fecha')
  })

  it('clicking "Continuar de todos modos" calls onSubmit', async () => {
    const onSubmit = vi.fn()
    const conflict = makeConflict('ovr-1', '2020-01-01', null)
    render(<OverrideScopeDialog {...BASE_PROPS} existingOverrides={[conflict]} onSubmit={onSubmit} />)
    await clickMainSubmit()
    const confirmBtn = Array.from(document.body.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Continuar'))!
    await act(async () => { fireEvent.click(confirmBtn) })
    expect(onSubmit).toHaveBeenCalled()
  })

  it('renders conflict list with time info', async () => {
    const conflict = makeConflict('ovr-1', '2020-01-01', null)
    render(<OverrideScopeDialog {...BASE_PROPS} existingOverrides={[conflict]} />)
    await clickMainSubmit()
    expect(document.body.textContent).toContain('09:00')
  })

  it('conflicts step shows isError message', async () => {
    const conflict = makeConflict('ovr-1', '2020-01-01', null)
    const { rerender } = render(<OverrideScopeDialog {...BASE_PROPS} existingOverrides={[conflict]} />)
    await clickMainSubmit()
    rerender(<OverrideScopeDialog {...BASE_PROPS} existingOverrides={[conflict]} isError />)
    expect(document.body.textContent).toContain('Ocurrió un error')
  })

  it('conflicts step shows "Guardando…" when isPending is true', async () => {
    const conflict = makeConflict('ovr-1', '2020-01-01', null)
    const { rerender } = render(<OverrideScopeDialog {...BASE_PROPS} existingOverrides={[conflict]} />)
    await clickMainSubmit()
    rerender(<OverrideScopeDialog {...BASE_PROPS} existingOverrides={[conflict]} isPending />)
    expect(document.body.textContent).toContain('Guardando…')
  })

  it('conflict with note shows the note text', async () => {
    const conflict: ScheduleDayOverride = {
      ...makeConflict('ovr-1', '2020-01-01', null),
      note: 'Excepción especial',
    }
    render(<OverrideScopeDialog {...BASE_PROPS} existingOverrides={[conflict]} />)
    await clickMainSubmit()
    expect(document.body.textContent).toContain('Excepción especial')
  })

  it('conflict with is_day_off shows "Descanso"', async () => {
    const conflict: ScheduleDayOverride = {
      ...makeConflict('ovr-1', '2020-01-01', null),
      is_day_off: true,
      expected_start: null,
      expected_end: null,
    }
    render(<OverrideScopeDialog {...BASE_PROPS} existingOverrides={[conflict]} />)
    await clickMainSubmit()
    expect(document.body.textContent).toContain('Descanso')
  })

  it('no conflict: calling onSubmit directly when no conflicts exist', async () => {
    const onSubmit = vi.fn()
    render(<OverrideScopeDialog {...BASE_PROPS} onSubmit={onSubmit} />)
    await clickMainSubmit()
    expect(onSubmit).toHaveBeenCalled()
  })

  it('renders nothing when isOpen is false', () => {
    render(<OverrideScopeDialog {...BASE_PROPS} isOpen={false} />)
    expect(document.body.querySelector('dialog')).toBeNull()
  })

  it('keeps showing the last dayLabel while animating out after close', () => {
    const { rerender } = render(<OverrideScopeDialog {...BASE_PROPS} dayLabel="Martes" />)
    rerender(<OverrideScopeDialog {...BASE_PROPS} dayLabel="Martes" isOpen={false} />)
    expect(document.body.textContent).toContain('Ajuste — Martes')
  })
})

// ── nextDateForDow ─────────────────────────────────────────────────────────────

describe('nextDateForDow', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = nextDateForDow(1)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns a date that falls on the correct ISO day of week', () => {
    for (let dow = 1; dow <= 7; dow++) {
      const result = nextDateForDow(dow)
      const date = new Date(result + 'T00:00:00')
      // ISO: 1=Mon…7=Sun; JS: 0=Sun…6=Sat
      const jsDay = dow === 7 ? 0 : dow
      expect(date.getDay()).toBe(jsDay)
    }
  })

  it('returns today when today is the target day', () => {
    const today = new Date()
    const todayDow = today.getDay() === 0 ? 7 : today.getDay()
    const result = nextDateForDow(todayDow)
    const expected = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')
    expect(result).toBe(expected)
  })

  it('returns a date at most 6 days in the future', () => {
    const today = new Date()
    for (let dow = 1; dow <= 7; dow++) {
      const result = nextDateForDow(dow)
      const resultDate = new Date(result + 'T00:00:00')
      const diffDays = Math.round((resultDate.getTime() - today.setHours(0, 0, 0, 0)) / 86400000)
      expect(diffDays).toBeGreaterThanOrEqual(0)
      expect(diffDays).toBeLessThanOrEqual(6)
    }
  })
})

// ── detectConflicts ────────────────────────────────────────────────────────────

function makeOverride(id: string, from: string, to: string | null): ScheduleDayOverride {
  return {
    id,
    employment_period_id: 'period-01',
    day_of_week: 1,
    effective_from: from,
    effective_to: to,
    is_day_off: false,
    expected_start: '08:00',
    expected_lunch_start: null,
    expected_lunch_end: null,
    lunch_duration_minutes: null,
    expected_end: '17:00',
    note: null,
    created_at: '2026-01-01T00:00:00+00:00',
    updated_at: '2026-01-01T00:00:00+00:00',
  }
}

describe('detectConflicts', () => {
  it('returns empty when there are no existing overrides', () => {
    expect(detectConflicts('2026-03-01', '2026-03-31', [])).toEqual([])
  })

  it('detects a direct overlap', () => {
    const existing = [makeOverride('a', '2026-03-10', '2026-03-20')]
    const result = detectConflicts('2026-03-15', '2026-03-25', existing)
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('a')
  })

  it('detects overlap when new range is fully contained within existing', () => {
    const existing = [makeOverride('a', '2026-03-01', '2026-03-31')]
    const result = detectConflicts('2026-03-10', '2026-03-20', existing)
    expect(result).toHaveLength(1)
  })

  it('detects overlap when existing range is fully contained within new', () => {
    const existing = [makeOverride('a', '2026-03-10', '2026-03-20')]
    const result = detectConflicts('2026-03-01', '2026-03-31', existing)
    expect(result).toHaveLength(1)
  })

  it('does not flag adjacent ranges (touching dates without overlap)', () => {
    const existing = [makeOverride('a', '2026-03-01', '2026-03-10')]
    // new range starts the day after existing ends — no overlap
    const result = detectConflicts('2026-03-11', '2026-03-20', existing)
    expect(result).toHaveLength(0)
  })

  it('treats null effective_to on new range as indefinite (+∞)', () => {
    const existing = [makeOverride('a', '2026-04-01', '2026-04-30')]
    const result = detectConflicts('2026-03-01', null, existing)
    expect(result).toHaveLength(1)
  })

  it('treats null effective_to on existing override as indefinite (+∞)', () => {
    const existing = [makeOverride('a', '2026-03-15', null)]
    const result = detectConflicts('2026-03-01', '2026-03-20', existing)
    expect(result).toHaveLength(1)
  })

  it('detects no conflict when new range is entirely before existing', () => {
    const existing = [makeOverride('a', '2026-04-01', '2026-04-30')]
    const result = detectConflicts('2026-03-01', '2026-03-31', existing)
    expect(result).toHaveLength(0)
  })

  it('detects no conflict when new range is entirely after existing', () => {
    const existing = [makeOverride('a', '2026-01-01', '2026-01-31')]
    const result = detectConflicts('2026-03-01', '2026-03-31', existing)
    expect(result).toHaveLength(0)
  })

  it('returns multiple conflicting overrides', () => {
    const existing = [
      makeOverride('a', '2026-03-01', '2026-03-10'),
      makeOverride('b', '2026-03-08', '2026-03-15'),
      makeOverride('c', '2026-04-01', '2026-04-30'),
    ]
    const result = detectConflicts('2026-03-05', '2026-03-12', existing)
    expect(result).toHaveLength(2)
    expect(result.map((o) => o.id)).toContain('a')
    expect(result.map((o) => o.id)).toContain('b')
  })
})
