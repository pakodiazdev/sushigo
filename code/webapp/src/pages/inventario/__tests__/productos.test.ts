// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { resolvePanelTitle } from '../productos'

describe('resolvePanelTitle', () => {
  it('returns the top-level Product title outside detail mode', () => {
    expect(resolvePanelTitle('create', 'list', 'list')).toBe('Nuevo producto')
    expect(resolvePanelTitle('edit', 'list', 'list')).toBe('Editar producto')
  })

  it('returns the Product Detail title when no nested Variant screen is active', () => {
    expect(resolvePanelTitle('detail', 'list', 'list')).toBe('Detalle del producto')
  })

  it('returns the Variant screen title when a nested Variant screen takes over the panel', () => {
    expect(resolvePanelTitle('detail', 'create', 'list')).toBe('Nueva variante')
    expect(resolvePanelTitle('detail', 'edit', 'list')).toBe('Editar variante')
  })

  it('returns the Variant Detail title when viewing a Variant with no Presentation screen active', () => {
    expect(resolvePanelTitle('detail', 'detail', 'list')).toBe('Detalle de la variante')
  })

  it('returns the Presentation screen title when it takes over the panel, one level deeper', () => {
    expect(resolvePanelTitle('detail', 'detail', 'assign')).toBe('Asignar presentación de compra')
    expect(resolvePanelTitle('detail', 'detail', 'edit')).toBe('Editar presentación de compra')
  })
})
