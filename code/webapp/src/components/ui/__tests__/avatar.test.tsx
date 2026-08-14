/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { Avatar, getInitials } from '../avatar'

describe('getInitials', () => {
    it('combines the first letter of the first and last word', () => {
        expect(getInitials('Juan Perez')).toBe('JP')
    })

    it('uses the first and last word for names with a middle name', () => {
        expect(getInitials('Juan Carlos Perez')).toBe('JP')
    })

    it('uses the first two letters of a single-word name', () => {
        expect(getInitials('Juan')).toBe('JU')
    })

    it('falls back to a question mark for an empty name', () => {
        expect(getInitials('')).toBe('?')
        expect(getInitials('   ')).toBe('?')
    })

    it('is deterministic for the same name', () => {
        expect(getInitials('Maria Lopez')).toBe(getInitials('Maria Lopez'))
    })
})

describe('Avatar', () => {
    afterEach(() => {
        cleanup()
    })

    it('renders initials when no imageUrl is given', () => {
        render(<Avatar name="Juan Perez" />)
        expect(screen.getByText('JP')).toBeDefined()
    })

    it('renders an accessible label with the full name', () => {
        render(<Avatar name="Juan Perez" />)
        expect(screen.getByRole('img', { name: 'Juan Perez' })).toBeDefined()
    })

    it('renders the image when imageUrl is provided', () => {
        render(<Avatar name="Juan Perez" imageUrl="https://example.com/avatar.jpg" />)
        const img = screen.getByRole('img', { name: 'Juan Perez' }).querySelector('img')
        expect(img).not.toBeNull()
        expect(img?.getAttribute('src')).toBe('https://example.com/avatar.jpg')
    })

    it('falls back to initials when the image fails to load', () => {
        render(<Avatar name="Juan Perez" imageUrl="https://example.com/broken.jpg" />)
        const img = screen.getByRole('img', { name: 'Juan Perez' }).querySelector('img')!
        fireEvent.error(img)
        expect(screen.getByText('JP')).toBeDefined()
    })

    it('produces the same initials and color classes for the same name across renders', () => {
        const { container: first } = render(<Avatar name="Maria Lopez" />)
        const firstClassName = first.firstElementChild?.className
        cleanup()

        const { container: second } = render(<Avatar name="Maria Lopez" />)
        expect(second.firstElementChild?.className).toBe(firstClassName)
    })

    it('applies the requested size', () => {
        render(<Avatar name="Juan Perez" size="lg" />)
        const wrapper = screen.getByRole('img', { name: 'Juan Perez' })
        expect(wrapper.className).toContain('h-16')
    })

    it('defaults to a "Usuario" label when name is empty', () => {
        render(<Avatar name="" />)
        expect(screen.getByRole('img', { name: 'Usuario' })).toBeDefined()
    })
})
