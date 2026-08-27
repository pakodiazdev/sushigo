// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useRouterState: () => ({
    location: { pathname: '/inventario/insumos' },
  }),
  Link: ({ to, children, className, 'aria-label': ariaLabel }: {
    to: string
    children: React.ReactNode
    className?: string
    'aria-label'?: string
  }) => (
    <a href={to} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}))

describe('Breadcrumbs', () => {
  afterEach(() => { cleanup() })

  describe('with custom items', () => {
    it('renders provided items', () => {
      const items = [
        { label: 'Inventario', path: '/inventory' },
        { label: 'Productos', path: '/inventory/items' },
      ]
      const { getByText } = render(<Breadcrumbs items={items} />)
      expect(getByText('Inventario')).toBeDefined()
      expect(getByText('Productos')).toBeDefined()
    })

    it('renders home link', () => {
      const items = [{ label: 'Inventario', path: '/inventory' }]
      const { container } = render(<Breadcrumbs items={items} />)
      const homeLink = container.querySelector('a[aria-label="Home"]')
      expect(homeLink).not.toBeNull()
    })

    it('renders last item as current page (span not link)', () => {
      const items = [
        { label: 'Inventario', path: '/inventory' },
        { label: 'Items', path: '/inventory/items' },
      ]
      const { getByText } = render(<Breadcrumbs items={items} />)
      const lastItem = getByText('Items')
      expect(lastItem.tagName.toLowerCase()).toBe('span')
      expect(lastItem.getAttribute('aria-current')).toBe('page')
    })

    it('renders non-last items as links', () => {
      const items = [
        { label: 'Inventario', path: '/inventory' },
        { label: 'Items', path: '/inventory/items' },
      ]
      const { getByText } = render(<Breadcrumbs items={items} />)
      const firstItem = getByText('Inventario')
      expect(firstItem.tagName.toLowerCase()).toBe('a')
    })

    it('applies correct href to link items', () => {
      const items = [
        { label: 'Inventario', path: '/inventory' },
        { label: 'Items', path: '/inventory/items' },
      ]
      const { getByText } = render(<Breadcrumbs items={items} />)
      const link = getByText('Inventario') as HTMLAnchorElement
      expect(link.href).toContain('/inventory')
    })

    it('renders nav element with aria-label', () => {
      const items = [{ label: 'Inventario', path: '/inventory' }]
      const { container } = render(<Breadcrumbs items={items} />)
      const nav = container.querySelector('nav[aria-label="Breadcrumb"]')
      expect(nav).not.toBeNull()
    })

    it('applies custom className', () => {
      const items = [{ label: 'Home', path: '/home' }]
      const { container } = render(<Breadcrumbs items={items} className="my-breadcrumbs" />)
      const nav = container.querySelector('.my-breadcrumbs')
      expect(nav).not.toBeNull()
    })
  })

  describe('empty items', () => {
    it('returns null when items array is empty', () => {
      const { container } = render(<Breadcrumbs items={[]} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('auto-generated from route', () => {
    it('auto-generates breadcrumbs from current path when no items provided', () => {
      // useRouterState mocked to return /inventario/insumos
      const { getByText } = render(<Breadcrumbs />)
      // Should generate: Inventario > Insumos
      expect(getByText('Inventario')).toBeDefined()
      expect(getByText('Insumos')).toBeDefined()
    })

    it('shows known route labels from mapping', () => {
      const { getByText } = render(<Breadcrumbs />)
      expect(getByText('Inventario')).toBeDefined()
    })
  })
})
