// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { resolvePanelTitle } from '../price-list-panel-title'

describe('resolvePanelTitle', () => {
  it('returns the top-level Price List title outside detail mode', () => {
    expect(resolvePanelTitle('create', 'list', 'list')).toBe('Nueva lista de precios')
    expect(resolvePanelTitle('edit', 'list', 'list')).toBe('Editar lista de precios')
  })

  it('returns the Price List Detail title when neither nested section takes over', () => {
    expect(resolvePanelTitle('detail', 'list', 'list')).toBe('Detalle de la lista de precios')
  })

  it('returns the Assignment title when the Assignment form takes over the panel', () => {
    expect(resolvePanelTitle('detail', 'create', 'list')).toBe('Asignación de lista de precios')
    expect(resolvePanelTitle('detail', 'edit', 'list')).toBe('Asignación de lista de precios')
  })

  it('returns the Variant Price title when the Variant Price form takes over the panel', () => {
    expect(resolvePanelTitle('detail', 'list', 'create')).toBe('Precio de variante')
    expect(resolvePanelTitle('detail', 'list', 'edit')).toBe('Precio de variante')
  })

  it('prefers the Assignment title if both were somehow non-list at once', () => {
    // Sibling sections share one panel — the page's own tracked handlers guarantee this never
    // happens in practice (opening one resets the other), but resolvePanelTitle still needs a
    // deterministic answer if it ever did.
    expect(resolvePanelTitle('detail', 'edit', 'create')).toBe('Asignación de lista de precios')
  })
})
