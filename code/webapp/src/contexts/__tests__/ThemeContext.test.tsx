/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, renderHook, act } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../ThemeContext'

describe('ThemeContext', () => {
    beforeEach(() => {
        // Reset localStorage and document classes before each test
        localStorage.clear()
        document.documentElement.classList.remove('light', 'dark')
    })

    afterEach(() => {
        cleanup()
        localStorage.clear()
        document.documentElement.classList.remove('light', 'dark')
    })

    describe('ThemeProvider', () => {
        it('renders children', () => {
            const { getByText } = render(
                <ThemeProvider>
                    <div>Child Content</div>
                </ThemeProvider>
            )
            expect(getByText('Child Content')).toBeDefined()
        })

        it('defaults to light theme', () => {
            render(
                <ThemeProvider>
                    <div>Content</div>
                </ThemeProvider>
            )
            expect(document.documentElement.classList.contains('light')).toBe(true)
        })

        it('reads theme from localStorage', () => {
            localStorage.setItem('theme', 'dark')
            render(
                <ThemeProvider>
                    <div>Content</div>
                </ThemeProvider>
            )
            expect(document.documentElement.classList.contains('dark')).toBe(true)
        })

        it('saves theme to localStorage', () => {
            render(
                <ThemeProvider>
                    <div>Content</div>
                </ThemeProvider>
            )
            expect(localStorage.getItem('theme')).toBe('light')
        })
    })

    describe('useTheme', () => {
        it('throws error when used outside ThemeProvider', () => {
            expect(() => {
                renderHook(() => useTheme())
            }).toThrow('useTheme must be used within ThemeProvider')
        })

        it('returns theme value', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            })
            expect(result.current.theme).toBe('light')
        })

        it('returns toggleTheme function', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            })
            expect(typeof result.current.toggleTheme).toBe('function')
        })

        it('toggles from light to dark', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            })

            expect(result.current.theme).toBe('light')

            act(() => {
                result.current.toggleTheme()
            })

            expect(result.current.theme).toBe('dark')
        })

        it('toggles from dark to light', () => {
            localStorage.setItem('theme', 'dark')
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            })

            expect(result.current.theme).toBe('dark')

            act(() => {
                result.current.toggleTheme()
            })

            expect(result.current.theme).toBe('light')
        })

        it('updates document class on toggle', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            })

            expect(document.documentElement.classList.contains('light')).toBe(true)

            act(() => {
                result.current.toggleTheme()
            })

            expect(document.documentElement.classList.contains('dark')).toBe(true)
            expect(document.documentElement.classList.contains('light')).toBe(false)
        })

        it('updates localStorage on toggle', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider,
            })

            expect(localStorage.getItem('theme')).toBe('light')

            act(() => {
                result.current.toggleTheme()
            })

            expect(localStorage.getItem('theme')).toBe('dark')
        })
    })

    describe('Toggle integration', () => {
        it('works with button component', () => {
            function ThemeToggle() {
                const { theme, toggleTheme } = useTheme()
                return (
                    <button onClick={toggleTheme} data-testid="toggle">
                        Theme: {theme}
                    </button>
                )
            }

            const { getByTestId, getByText } = render(
                <ThemeProvider>
                    <ThemeToggle />
                </ThemeProvider>
            )

            expect(getByText('Theme: light')).toBeDefined()

            fireEvent.click(getByTestId('toggle'))

            expect(getByText('Theme: dark')).toBeDefined()
        })
    })
})
