/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cropImageToBlob } from '../canvas-crop'

// jsdom implements HTMLCanvasElement but not actual 2D rendering (getContext('2d')
// returns null without the optional 'canvas' npm package) — drawImage/toBlob are
// mocked directly on the prototype instead. jsdom also never fires onload/onerror
// for a real image decode, so Image itself is replaced with a controllable stub.
class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private _src = ''
  get src() {
    return this._src
  }
  set src(value: string) {
    this._src = value
    queueMicrotask(() => this.onload?.())
  }
}

describe('cropImageToBlob', () => {
  const drawImage = vi.fn()
  let originalImage: typeof Image
  let capturedCanvas: HTMLCanvasElement | undefined

  beforeEach(() => {
    originalImage = global.Image
    // @ts-expect-error -- test double, not a full Image implementation
    global.Image = MockImage
    drawImage.mockClear()
    capturedCanvas = undefined

    // Captured via document.createElement rather than aliasing `this` inside the
    // getContext mock (no-this-alias) — cropImageToBlob only ever creates one
    // canvas per call, so the last one created is the one under test.
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === 'canvas') {
        capturedCanvas = element as HTMLCanvasElement
      }
      return element
    })

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D)

    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback: BlobCallback) {
      callback(new Blob(['fake-jpeg-bytes'], { type: 'image/jpeg' }))
    })
  })

  afterEach(() => {
    global.Image = originalImage
    vi.restoreAllMocks()
  })

  it('draws the requested crop rectangle onto a square canvas at the output size', async () => {
    const blob = await cropImageToBlob('blob:fake-src', { x: 10, y: 20, width: 100, height: 150 }, 512)

    expect(blob).toBeInstanceOf(Blob)
    expect(drawImage).toHaveBeenCalledWith(expect.any(MockImage), 10, 20, 100, 150, 0, 0, 512, 512)
  })

  it('sizes the canvas to outputSize x outputSize', async () => {
    await cropImageToBlob('blob:fake-src', { x: 0, y: 0, width: 50, height: 50 }, 256)

    expect(capturedCanvas?.width).toBe(256)
    expect(capturedCanvas?.height).toBe(256)
  })

  it('exports as JPEG at 0.9 quality', async () => {
    const toBlobSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob')

    await cropImageToBlob('blob:fake-src', { x: 0, y: 0, width: 50, height: 50 }, 256)

    expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9)
  })

  it('rejects when the canvas has no 2D context available', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    await expect(
      cropImageToBlob('blob:fake-src', { x: 0, y: 0, width: 10, height: 10 }, 512)
    ).rejects.toThrow(/2D context/)
  })

  it('rejects when toBlob yields no blob', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback: BlobCallback) {
      callback(null)
    })

    await expect(
      cropImageToBlob('blob:fake-src', { x: 0, y: 0, width: 10, height: 10 }, 512)
    ).rejects.toThrow(/export/)
  })

  it('rejects when the source image fails to load', async () => {
    // @ts-expect-error -- test double, not a full Image implementation
    global.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.())
      }
    }

    await expect(
      cropImageToBlob('blob:fake-src', { x: 0, y: 0, width: 10, height: 10 }, 512)
    ).rejects.toThrow(/load/)
  })
})
