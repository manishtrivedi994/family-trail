export async function compressImage(file: File, maxSize = 800): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(file) // Fallback to original if ctx creation fails
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.85)
    }
    img.onerror = () => resolve(file) // Fallback on error
    img.src = URL.createObjectURL(file)
  })
}
