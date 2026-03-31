/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup, renderHook, act } from '@testing-library/react'
import { SidebarProvider, useSidebar } from '../SidebarContext'

describe('SidebarContext', () => {
    afterEach(() => {
        cleanup()
    })

    describe('SidebarProvider', () => {
        it('renders children', () => {
            const { getByText } = render(
                <SidebarProvider>
                    <div>Child Content</div>
                </SidebarProvider>
            )
            expect(getByText('Child Content')).toBeDefined()
        })
    })

    describe('useSidebar', () => {
        it('throws error when used outside SidebarProvider', () => {
            expect(() => {
                renderHook(() => useSidebar())
            }).toThrow('useSidebar must be used within SidebarProvider')
        })

        it('returns initial state with collapsed false', () => {
            const { result } = renderHook(() => useSidebar(), {
                wrapper: SidebarProvider,
            })
            expect(result.current.isCollapsed).toBe(false)
        })

        it('returns initial state with mobile closed', () => {
            const { result } = renderHook(() => useSidebar(), {
                wrapper: SidebarProvider,
            })
            expect(result.current.isMobileOpen).toBe(false)
        })

        it('provides toggleSidebar function', () => {
            const { result } = renderHook(() => useSidebar(), {
                wrapper: SidebarProvider,
            })
            expect(typeof result.current.toggleSidebar).toBe('function')
        })

        it('provides toggleMobileSidebar function', () => {
            const { result } = renderHook(() => useSidebar(), {
                wrapper: SidebarProvider,
            })
            expect(typeof result.current.toggleMobileSidebar).toBe('function')
        })

        it('provides closeMobileSidebar function', () => {
            const { result } = renderHook(() => useSidebar(), {
                wrapper: SidebarProvider,
            })
            expect(typeof result.current.closeMobileSidebar).toBe('function')
        })

        it('toggles collapsed state', () => {
            const { result } = renderHook(() => useSidebar(), {
                wrapper: SidebarProvider,
            })

            expect(result.current.isCollapsed).toBe(false)

            act(() => {
                result.current.toggleSidebar()
            })

            expect(result.current.isCollapsed).toBe(true)

            act(() => {
                result.current.toggleSidebar()
            })

            expect(result.current.isCollapsed).toBe(false)
        })

        it('toggles mobile sidebar state', () => {
            const { result } = renderHook(() => useSidebar(), {
                wrapper: SidebarProvider,
            })

            expect(result.current.isMobileOpen).toBe(false)

            act(() => {
                result.current.toggleMobileSidebar()
            })

            expect(result.current.isMobileOpen).toBe(true)

            act(() => {
                result.current.toggleMobileSidebar()
            })

            expect(result.current.isMobileOpen).toBe(false)
        })

        it('closes mobile sidebar', () => {
            const { result } = renderHook(() => useSidebar(), {
                wrapper: SidebarProvider,
            })

            // First open it
            act(() => {
                result.current.toggleMobileSidebar()
            })
            expect(result.current.isMobileOpen).toBe(true)

            // Then close it
            act(() => {
                result.current.closeMobileSidebar()
            })
            expect(result.current.isMobileOpen).toBe(false)
        })

        it('closeMobileSidebar is idempotent when already closed', () => {
            const { result } = renderHook(() => useSidebar(), {
                wrapper: SidebarProvider,
            })

            expect(result.current.isMobileOpen).toBe(false)

            act(() => {
                result.current.closeMobileSidebar()
            })

            expect(result.current.isMobileOpen).toBe(false)
        })
    })

    describe('Integration', () => {
        it('works with button component', () => {
            function SidebarToggle() {
                const { isCollapsed, toggleSidebar } = useSidebar()
                return (
                    <button onClick={toggleSidebar} data-testid="toggle">
                        {isCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                )
            }

            const { getByTestId, getByText } = render(
                <SidebarProvider>
                    <SidebarToggle />
                </SidebarProvider>
            )

            expect(getByText('Collapse')).toBeDefined()

            fireEvent.click(getByTestId('toggle'))

            expect(getByText('Expand')).toBeDefined()
        })
    })
})
