export interface CropPixels {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Draws the given pixel rectangle of `imageSrc` onto a square
 * `outputSize` x `outputSize` canvas and exports it as a JPEG Blob —
 * the avatar crop dialog's own "flatten the crop into a real file"
 * step, framework-free so it stays trivially unit-testable.
 */
export function cropImageToBlob(imageSrc: string, cropPixels: CropPixels, outputSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = outputSize
      canvas.height = outputSize

      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Canvas 2D context is not available.'))
        return
      }

      context.drawImage(
        image,
        cropPixels.x,
        cropPixels.y,
        cropPixels.width,
        cropPixels.height,
        0,
        0,
        outputSize,
        outputSize
      )

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to export the cropped image.'))
            return
          }
          resolve(blob)
        },
        'image/jpeg',
        0.9
      )
    }

    image.onerror = () => reject(new Error('Failed to load the image for cropping.'))
    image.src = imageSrc
  })
}
