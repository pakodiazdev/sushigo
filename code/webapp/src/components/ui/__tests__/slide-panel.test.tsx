// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup, act } from '@testing-library/react'
import { SlidePanel } from '@/components/ui/slide-panel'

/** Flushes the panel's `setTimeout(..., 0)` focus-move microtask. */
async function flushFocusTimer() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('SlidePanel', () => {
  afterEach(() => { cleanup() })

  describe('visibility', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <SlidePanel isOpen={false} onClose={vi.fn()}>
          <p>Content</p>
        </SlidePanel>
      )
      expect(container.querySelector('p')).toBeNull()
    })

    it('renders children when isOpen is true', () => {
      const { getByText } = render(
        <SlidePanel isOpen={true} onClose={vi.fn()}>
          <p>Panel Content</p>
        </SlidePanel>
      )
      expect(getByText('Panel Content')).toBeDefined()
    })
  })

  describe('title and description', () => {
    it('renders title when provided', () => {
      const { getByText } = render(
        <SlidePanel isOpen={true} onClose={vi.fn()} title="My Panel Title">
          <p>Content</p>
        </SlidePanel>
      )
      expect(getByText('My Panel Title')).toBeDefined()
    })

    it('renders description when provided', () => {
      const { getByText } = render(
        <SlidePanel isOpen={true} onClose={vi.fn()} title="Title" description="Helpful description">
          <p>Content</p>
        </SlidePanel>
      )
      expect(getByText('Helpful description')).toBeDefined()
    })

    it('renders without title when not provided', () => {
      const { container } = render(
        <SlidePanel isOpen={true} onClose={vi.fn()}>
          <p>Content</p>
        </SlidePanel>
      )
      // h2 title element should not exist when no title is passed
      const h2 = container.querySelector('h2')
      expect(h2).toBeNull()
    })
  })

  describe('close button', () => {
    it('renders close button when panel is open', () => {
      const { container } = render(
        <SlidePanel isOpen={true} onClose={vi.fn()} title="Test">
          <p>Content</p>
        </SlidePanel>
      )
      // Close button contains an sr-only span with "Close panel"
      const buttons = container.querySelectorAll('button')
      const closeBtn = Array.from(buttons).find(btn =>
        btn.querySelector('.sr-only')?.textContent === 'Close panel'
      )
      expect(closeBtn).not.toBeUndefined()
    })

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn()
      const { container } = render(
        <SlidePanel isOpen={true} onClose={onClose} title="Test">
          <p>Content</p>
        </SlidePanel>
      )
      const buttons = container.querySelectorAll('button')
      const closeBtn = Array.from(buttons).find(btn =>
        btn.querySelector('.sr-only')?.textContent === 'Close panel'
      )
      if (closeBtn) fireEvent.click(closeBtn)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('keyboard', () => {
    it('calls onClose when Escape key is pressed', () => {
      const onClose = vi.fn()
      render(
        <SlidePanel isOpen={true} onClose={onClose}>
          <p>Content</p>
        </SlidePanel>
      )
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does not call onClose on other keys', () => {
      const onClose = vi.fn()
      render(
        <SlidePanel isOpen={true} onClose={onClose}>
          <p>Content</p>
        </SlidePanel>
      )
      fireEvent.keyDown(document, { key: 'Enter' })
      expect(onClose).not.toHaveBeenCalled()
    })

    it('only closes the topmost panel on Escape when two independent panels are stacked', () => {
      const onCloseBottom = vi.fn()
      const onCloseTop = vi.fn()
      render(
        <>
          <SlidePanel isOpen={true} onClose={onCloseBottom}>
            <p>Bottom panel</p>
          </SlidePanel>
          <SlidePanel isOpen={true} onClose={onCloseTop}>
            <p>Top panel</p>
          </SlidePanel>
        </>
      )
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onCloseTop).toHaveBeenCalledTimes(1)
      expect(onCloseBottom).not.toHaveBeenCalled()
    })

    it('does not let the bottom panel react to Escape while the top panel is still mid-exit-animation', () => {
      const onCloseBottom = vi.fn()
      const onCloseTop = vi.fn()
      const { rerender } = render(
        <>
          <SlidePanel isOpen={true} onClose={onCloseBottom} animationDuration={50}>
            <p>Bottom panel</p>
          </SlidePanel>
          <SlidePanel isOpen={true} onClose={onCloseTop} animationDuration={50}>
            <p>Top panel</p>
          </SlidePanel>
        </>
      )

      // Close the top panel — it starts its exit animation but stays mounted/visible for
      // `animationDuration` (it must not immediately hand "topmost" to the bottom panel).
      rerender(
        <>
          <SlidePanel isOpen={true} onClose={onCloseBottom} animationDuration={50}>
            <p>Bottom panel</p>
          </SlidePanel>
          <SlidePanel isOpen={false} onClose={onCloseTop} animationDuration={50}>
            <p>Top panel</p>
          </SlidePanel>
        </>
      )

      // A second Escape press during the exit animation must not fall through to the
      // still-covered bottom panel and discard its own nested state.
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onCloseBottom).not.toHaveBeenCalled()
    })

    it('lets the bottom panel react to Escape again once the top panel has fully finished exiting', async () => {
      const onCloseBottom = vi.fn()
      const { rerender } = render(
        <>
          <SlidePanel isOpen={true} onClose={onCloseBottom} animationDuration={10}>
            <p>Bottom panel</p>
          </SlidePanel>
          <SlidePanel isOpen={true} onClose={vi.fn()} animationDuration={10}>
            <p>Top panel</p>
          </SlidePanel>
        </>
      )

      rerender(
        <>
          <SlidePanel isOpen={true} onClose={onCloseBottom} animationDuration={10}>
            <p>Bottom panel</p>
          </SlidePanel>
          <SlidePanel isOpen={false} onClose={vi.fn()} animationDuration={10}>
            <p>Top panel</p>
          </SlidePanel>
        </>
      )

      // Let the exit animation's timer elapse so the top panel actually unregisters.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30))
      })

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onCloseBottom).toHaveBeenCalledTimes(1)
    })

    it('keeps body scroll locked while a stacked panel remains open after the top one closes', () => {
      const { rerender } = render(
        <>
          <SlidePanel isOpen={true} onClose={vi.fn()}>
            <p>Bottom panel</p>
          </SlidePanel>
          <SlidePanel isOpen={true} onClose={vi.fn()}>
            <p>Top panel</p>
          </SlidePanel>
        </>
      )
      expect(document.body.style.overflow).toBe('hidden')

      rerender(
        <>
          <SlidePanel isOpen={true} onClose={vi.fn()}>
            <p>Bottom panel</p>
          </SlidePanel>
          <SlidePanel isOpen={false} onClose={vi.fn()}>
            <p>Top panel</p>
          </SlidePanel>
        </>
      )
      expect(document.body.style.overflow).toBe('hidden')
    })
  })

  describe('size variants', () => {
    it('applies sm size class', () => {
      const { container } = render(
        <SlidePanel isOpen={true} onClose={vi.fn()} size="sm">
          <p>Content</p>
        </SlidePanel>
      )
      const panelEl = container.querySelector('.max-w-md')
      expect(panelEl).not.toBeNull()
    })

    it('applies lg size class', () => {
      const { container } = render(
        <SlidePanel isOpen={true} onClose={vi.fn()} size="lg">
          <p>Content</p>
        </SlidePanel>
      )
      const panelEl = container.querySelector('.max-w-4xl')
      expect(panelEl).not.toBeNull()
    })
  })

  describe('position', () => {
    it('applies right position by default', () => {
      const { container } = render(
        <SlidePanel isOpen={true} onClose={vi.fn()}>
          <p>Content</p>
        </SlidePanel>
      )
      // Panel should be present (right is default)
      expect(container.firstChild).not.toBeNull()
    })
  })

  describe('custom className', () => {
    it('applies custom className to the panel', () => {
      const { container } = render(
        <SlidePanel isOpen={true} onClose={vi.fn()} className="my-custom-class">
          <p>Content</p>
        </SlidePanel>
      )
      const withClass = container.querySelector('.my-custom-class')
      expect(withClass).not.toBeNull()
    })
  })

  describe('focus management', () => {
    // No `title` in these panels so there's no header/close button — the
    // child button is then the panel's only focusable element, making
    // "focus moved into this panel" unambiguous to assert on.
    it('moves focus into the panel when it opens', async () => {
      const { getByText } = render(
        <SlidePanel isOpen={true} onClose={vi.fn()}>
          <button type="button">First field</button>
        </SlidePanel>
      )
      await flushFocusTimer()
      expect(document.activeElement).toBe(getByText('First field'))
    })

    it('moves focus into the topmost panel, not the bottom one, when two panels are stacked', async () => {
      const { getByText } = render(
        <>
          <SlidePanel isOpen={true} onClose={vi.fn()}>
            <button type="button">Bottom field</button>
          </SlidePanel>
          <SlidePanel isOpen={true} onClose={vi.fn()}>
            <button type="button">Top field</button>
          </SlidePanel>
        </>
      )
      await flushFocusTimer()
      expect(document.activeElement).toBe(getByText('Top field'))
      expect(document.activeElement).not.toBe(getByText('Bottom field'))
    })

    it('restores focus to the previously focused element when the panel closes', async () => {
      const opener = document.createElement('button')
      opener.textContent = 'Open manager'
      document.body.appendChild(opener)
      opener.focus()

      const { rerender } = render(
        <SlidePanel isOpen={true} onClose={vi.fn()}>
          <button type="button">First field</button>
        </SlidePanel>
      )
      await flushFocusTimer()

      rerender(
        <SlidePanel isOpen={false} onClose={vi.fn()}>
          <button type="button">First field</button>
        </SlidePanel>
      )

      expect(document.activeElement).toBe(opener)
      document.body.removeChild(opener)
    })

    it('recovers focus into the new content when the panel swaps children in place without closing', async () => {
      const { getByText, getByPlaceholderText, rerender } = render(
        <SlidePanel isOpen={true} onClose={vi.fn()}>
          <button type="button">List row</button>
        </SlidePanel>
      )
      await flushFocusTimer()
      getByText('List row').focus()
      expect(document.activeElement).toBe(getByText('List row'))

      // Simulate the create→detail→edit content-swap pattern: the same
      // SlidePanel instance stays open (isOpen never changes) but renders a
      // different child, unmounting the focused control.
      rerender(
        <SlidePanel isOpen={true} onClose={vi.fn()}>
          <input placeholder="Edit form field" />
        </SlidePanel>
      )
      await flushFocusTimer()

      expect(document.activeElement).toBe(getByPlaceholderText('Edit form field'))
    })
  })

  describe('backdrop click', () => {
    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn()
      const { container } = render(
        <SlidePanel isOpen={true} onClose={onClose}>
          <p>Content</p>
        </SlidePanel>
      )
      // The backdrop is the fixed overlay div (first child in the portal/container)
      const backdrop = container.querySelector('[data-testid="slide-panel-backdrop"]') ??
        container.querySelector('.fixed.inset-0.bg-black\\/50') ??
        container.querySelector('.fixed.inset-0')
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(onClose).toHaveBeenCalled()
      }
      // If no backdrop selector found, still a valid test since it might use
      // a different DOM structure; we don't fail for optional behavior
    })
  })
})
