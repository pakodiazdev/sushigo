import { describe, expect, it, vi } from 'vitest'
import { fetchAllPages } from '../fetch-all-pages'

interface Item {
  id: string
}

describe('fetchAllPages', () => {
  it('fetches every page and flattens them into one response', async () => {
    const pageOne = Array.from({ length: 100 }, (_, index) => ({ id: `p${index + 1}` }))
    const pageTwo = [{ id: 'p101' }]

    const fetchPage = vi.fn((page: number) =>
      Promise.resolve({
        data: {
          status: 200,
          data: page === 1 ? pageOne : pageTwo,
          meta: { current_page: page, total: 101, last_page: 2 },
        },
      } as never)
    )

    const result = await fetchAllPages<Item>(fetchPage)

    expect(result.data.data).toHaveLength(101)
    expect(result.data.data.some((item) => item.id === 'p101')).toBe(true)
    expect(fetchPage).toHaveBeenCalledWith(1)
    expect(fetchPage).toHaveBeenCalledWith(2)
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('does not request a second page when everything fits on the first', async () => {
    const fetchPage = vi.fn(() =>
      Promise.resolve({
        data: { status: 200, data: [{ id: 'p1' }], meta: { current_page: 1, total: 1, last_page: 1 } },
      } as never)
    )

    const result = await fetchAllPages<Item>(fetchPage)

    expect(result.data.data).toHaveLength(1)
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('defaults to a single page when last_page is missing from meta', async () => {
    const fetchPage = vi.fn(() =>
      Promise.resolve({
        data: { status: 200, data: [{ id: 'p1' }], meta: { current_page: 1, total: 1 } },
      } as never)
    )

    const result = await fetchAllPages<Item>(fetchPage)

    expect(result.data.data).toHaveLength(1)
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })
})
