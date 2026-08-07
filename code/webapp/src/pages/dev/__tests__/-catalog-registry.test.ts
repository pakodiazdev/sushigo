// @vitest-environment jsdom
/**
 * Structural sanity checks for the components catalog registry — catches
 * copy/paste mistakes (duplicate ids, missing fields) when a new entry is
 * added, without asserting on the rendered visuals of every component.
 */
import { describe, it, expect } from 'vitest'
import { catalogSections } from '../-catalog-registry'

describe('catalogSections', () => {
  it('has at least one section', () => {
    expect(catalogSections.length).toBeGreaterThan(0)
  })

  it('every entry has a unique id across all sections', () => {
    const ids = catalogSections.flatMap((section) => section.entries.map((entry) => entry.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every entry has name, description, importPath and code', () => {
    for (const section of catalogSections) {
      for (const entry of section.entries) {
        expect(entry.name).toBeTruthy()
        expect(entry.description).toBeTruthy()
        // ui/ holds the generic design-system atoms; media/ (and any future
        // sibling reusable-but-not-generic package) holds components that
        // are reusable across domains without being part of the design
        // system itself — both belong in this catalog, a one-off
        // domain-specific component (e.g. src/components/inventory/) does
        // not. (\/|$) also allows importing straight from a package's own
        // barrel (e.g. `@/components/media`, no trailing file segment).
        expect(entry.importPath).toMatch(/^@\/components\/(ui|media)(\/|$)/)
        expect(entry.code).toBeTruthy()
      }
    }
  })

  it('covers the core UI components', () => {
    const names = catalogSections.flatMap((section) => section.entries.map((entry) => entry.name))
    for (const expected of ['Button', 'Card', 'Input', 'DataGrid', 'ConfirmDialog', 'SlidePanel', 'Tabs', 'DropdownMenu']) {
      expect(names).toContain(expected)
    }
  })
})
