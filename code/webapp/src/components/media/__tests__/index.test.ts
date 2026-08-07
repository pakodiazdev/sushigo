/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { MediaGalleryUploader, useMediaGalleryUploader } from '../index'

describe('media barrel exports', () => {
  it('re-exports MediaGalleryUploader', () => {
    expect(MediaGalleryUploader).toBeDefined()
  })

  it('re-exports useMediaGalleryUploader', () => {
    expect(useMediaGalleryUploader).toBeDefined()
  })
})
